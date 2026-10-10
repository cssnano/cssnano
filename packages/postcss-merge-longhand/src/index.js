import cssnanoUtils from 'cssnano-utils';
import { withoutVendorPrefix } from './lib/vendorPrefix.js';
import {
  allColumnProps,
  reduceColumns,
  setsOtherColumnProperty,
} from './lib/decl/columns.js';
import { addBoxDeclaration, reduceBox } from './lib/decl/boxReducer.js';
import { aliasedGroup, boxProperties } from './lib/decl/boxGroups.js';
import { reduceBorder } from './lib/decl/borderReducer.js';
import { reduceBorderRadius } from './lib/decl/borderRadiusReducer.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from './lib/decl/borderData.js';
import getBrowsersList from '#getBrowsersList';
import { alignmentProperties } from './lib/decl/alignmentForms.js';
import { reduceAlignmentFamily } from './lib/decl/alignmentReducer.js';
import { pairFamilyOf } from './lib/decl/pairForms.js';
import { reducePairFamily } from './lib/decl/pairReducer.js';
import { withTargetSupport } from './lib/isFallback.js';
import { clearSupportCache } from './lib/syntaxFeatures.js';
import {
  featuresSupportedByAll,
  BoxSupport,
  supportsPlaceShorthands,
  supportedPairShorthands,
} from './lib/targetSupport.js';
import { endsDeclarationRun } from './lib/decl/declarationRuns.js';
import { applyChildEdits } from './lib/deferredChildEdits.js';
import { discardOverriddenDeclarations } from './lib/decl/overriddenDeclarations.js';
import { decodedPropertyName, isAll } from './lib/decl/importanceLanes.js';
import {
  foldableShorthands,
  foldShorthandDeclaration,
} from './lib/minifyShorthand.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */
/** @import browserslist from 'browserslist' */
/** @import {BoxDeclarations} from './lib/decl/boxReducer.js'; */
/** @import {BoxGroup} from './lib/decl/boxGroups.js'; */

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * Prefixed aliases such as -webkit-justify-content and escaped spellings
 * share the cascade with the property they name, so the alignment reducer
 * must see them. It cannot parse an alias, so any alias leaves the whole
 * family unmerged in that run, which keeps the cascade intact.
 *
 * @param {string} prop - lowercased property name
 * @return {import('./lib/decl/alignmentForms.js').AlignmentFamilyConfig | undefined}
 */
function alignmentFamilyOf(prop) {
  const escaped = prop.includes('\\');
  if (!escaped && !prop.startsWith('-')) return alignmentProperties.get(prop);
  if (prop.startsWith('--')) return undefined;
  const name = escaped ? decodedPropertyName(prop) : prop;
  return name === undefined
    ? undefined
    : alignmentProperties.get(withoutVendorPrefix(name));
}

/** @import {PairFamily} from './lib/decl/pairForms.js'; */
/** @import {AlignmentFamilyConfig} from './lib/decl/alignmentForms.js'; */

/**
 * @typedef {{
 *   columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>,
 *   placeShorthands: boolean,
 *   boxSupport: BoxSupport,
 *   pairShorthands: ReadonlySet<string>
 * }} MergeContext
 */

/**
 * @typedef {{
 *   family: PairFamily | AlignmentFamilyConfig,
 *   decls: Declaration[],
 *   lanes: [Declaration[], Declaration[]]
 * }} FamilyDeclarations
 */

/**
 * Folds immediate shorthand declarations within a container (e.g. root or at-rule).
 * @param {Container} container
 * @param {Map<string, string | null>} shorthandMemoTable
 * @return {void}
 */
function foldContainerDeclarations(container, shorthandMemoTable) {
  if (!container.nodes) return;
  for (const node of container.nodes) {
    if (node.type === 'decl') {
      foldShorthandDeclaration(node, shorthandMemoTable);
    }
  }
}

/**
 * Runs property-family reducers on classified declarations for a container.
 * @param {Container} container
 * @param {{
 *   boxes: Map<BoxGroup, BoxDeclarations> | null,
 *   borderRadiusDecls: Declaration[],
 *   borderRadiusLanes: [Declaration[], Declaration[]],
 *   columnDecls: Declaration[],
 *   columnLanes: [Declaration[], Declaration[]],
 *   borderDeclarations: Declaration[],
 *   hasForeignBorder: boolean,
 *   families: Map<FamilyDeclarations['family'], FamilyDeclarations> | null,
 * }} state
 * @param {MergeContext} context
 * @return {void}
 */
function reduceClassifiedContainer(container, state, context) {
  if (state.boxes) {
    for (const box of state.boxes.values()) {
      reduceBox(container, box, context.boxSupport);
    }
  }
  if (state.borderRadiusDecls.length) {
    reduceBorderRadius(
      container,
      state.borderRadiusDecls,
      state.borderRadiusLanes
    );
  }
  if (state.borderDeclarations.length) {
    reduceBorder(container, state.borderDeclarations, state.hasForeignBorder);
  }
  if (state.families) {
    for (const { family, decls, lanes } of state.families.values()) {
      if ('longhands' in family) {
        reducePairFamily(container, family, decls, lanes);
      } else {
        reduceAlignmentFamily(container, family, decls, lanes);
      }
    }
  }
  if (state.columnDecls.length) {
    context.columnRules.push([container, state.columnDecls, state.columnLanes]);
  }
}

/**
 * Adds a declaration to its shorthand family, creating the family on first use.
 *
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {FamilyDeclarations['family']} family
 * @param {Declaration} child
 * @param {number} laneIndex
 * @return {void}
 */
function addFamilyDeclaration(state, family, child, laneIndex) {
  state.families ??= new Map();
  let entry = state.families.get(family);
  if (!entry) {
    entry = { family, decls: [], lanes: [[], []] };
    state.families.set(family, entry);
  }
  entry.decls.push(child);
  entry.lanes[laneIndex].push(child);
}

/**
 * Classifies a single declaration into the container accumulation state.
 *
 * @param {Declaration} child
 * @param {string} prop
 * @param {number} laneIndex
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {Omit<MergeContext, 'columnRules'>} context
 * @return {void}
 */
function classifyDeclaration(child, prop, laneIndex, state, context) {
  // Families the targets cannot parse are not collected, so they stay as written.
  const pair = pairFamilyOf(prop);
  if (pair && context.pairShorthands.has(pair.shorthand)) {
    addFamilyDeclaration(state, pair, child, laneIndex);
  }
  if (prop.startsWith('border')) {
    if (allRadiusProperties.has(prop)) {
      state.borderRadiusDecls.push(child);
      state.borderRadiusLanes[laneIndex].push(child);
    } else if (allPhysicalBorderProperties.has(prop)) {
      state.borderDeclarations.push(child);
    } else if (foldableShorthands.has(prop)) {
      foldShorthandDeclaration(child, context.shorthandMemoTable, prop);
    } else {
      state.hasForeignBorder = true;
    }
    return;
  }
  if (prop.startsWith('column')) {
    context.setsOtherColumn ||= setsOtherColumnProperty(child);
    if (allColumnProps.has(prop)) {
      state.columnDecls.push(child);
      state.columnLanes[laneIndex].push(child);
    }
    return;
  }
  const boxProperty = boxProperties.get(prop);
  const boxGroup = boxProperty?.family.group ?? aliasedGroup(prop);
  if (boxGroup) {
    addBoxDeclaration(state, child, boxProperty, boxGroup, laneIndex);
    foldShorthandDeclaration(child, context.shorthandMemoTable, prop);
    return;
  }
  // Only when every target supports place-* may one be synthesized.
  const alignmentFamily = context.placeShorthands
    ? alignmentFamilyOf(prop)
    : undefined;
  foldShorthandDeclaration(child, context.shorthandMemoTable, prop);
  if (alignmentFamily) {
    addFamilyDeclaration(state, alignmentFamily, child, laneIndex);
  }
}

/**
 * @return {Parameters<typeof reduceClassifiedContainer>[1]}
 */
function createContainerState() {
  return {
    boxes: null,
    borderRadiusDecls: [],
    borderRadiusLanes: [[], []],
    columnDecls: [],
    columnLanes: [[], []],
    borderDeclarations: [],
    hasForeignBorder: false,
    families: null,
  };
}

/**
 * Classifies declarations within a container, runs reducers, and tracks column candidates.
 * @param {Container} container
 * @param {MergeContext} context
 * @return {void}
 */
function processContainer(container, context) {
  if (!container.nodes) return;
  // Before classification, so the family reducers never see detached nodes.
  // Style rules only: at-rule descriptors follow their own validity rules.
  if (container.type === 'rule') {
    discardOverriddenDeclarations(container);
    applyChildEdits(container);
  }

  // Reducers remove nodes, so reduce only after the loop has read them all.
  const runs = [];
  let state = createContainerState();
  for (const child of container.nodes) {
    // Declarations after a nested rule cascade after its declarations, so a
    // shorthand merged across it would override them.
    if (endsDeclarationRun(child)) {
      runs.push(state);
      state = createContainerState();
      continue;
    }
    if (child.type !== 'decl') continue;
    const laneIndex = child.important ? 1 : 0;
    if (isAll(child)) {
      state.hasForeignBorder = true;
      if (state.boxes) {
        for (const box of state.boxes.values())
          box.lanes[laneIndex].push(child);
      }
      state.borderRadiusLanes[laneIndex].push(child);
      state.columnLanes[laneIndex].push(child);
      for (const family of state.families?.values() ?? []) {
        family.lanes[laneIndex].push(child);
      }
      continue;
    }

    classifyDeclaration(
      child,
      asciiLowerCase(child.prop),
      laneIndex,
      state,
      context
    );
  }

  runs.push(state);
  for (const run of runs) reduceClassifiedContainer(container, run, context);
  applyChildEdits(container);
}

/**
 * @param {import('postcss').Root} css
 * @param {boolean} placeShorthands
 * @param {BoxSupport} boxSupport
 * @param {ReadonlySet<string>} pairShorthands
 * @return {void}
 */
function mergeLonghands(css, placeShorthands, boxSupport, pairShorthands) {
  const context = {
    /** @type {[Container, Declaration[], [Declaration[], Declaration[]]][]} */
    columnRules: [],
    setsOtherColumn: false,
    /** @type {Map<string, string | null>} */
    shorthandMemoTable: new Map(),
    placeShorthands,
    boxSupport,
    pairShorthands,
  };

  foldContainerDeclarations(css, context.shorthandMemoTable);

  css.walk((node) => {
    if (node.type !== 'rule' && node.type !== 'atrule') return;
    if (node.nodes?.some((n) => n.type === 'decl')) {
      processContainer(node, context);
    }
  });

  if (!context.setsOtherColumn) {
    for (const [rule, decls, lanes] of context.columnRules) {
      reduceColumns(rule, decls, lanes);
    }
    // A rule may hold several runs; rebuild it once, after all of them.
    for (const [rule] of context.columnRules) applyChildEdits(rule);
  }
}

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(/** @type {Options} */ opts = {}) {
  return {
    postcssPlugin: 'postcss-merge-longhand',
    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(opts, stats, from, file, env);
      const placeShorthands = supportsPlaceShorthands(browsers);
      const boxSupport = new BoxSupport(browsers);
      const pairShorthands = supportedPairShorthands(browsers);
      const supportedFeatures = featuresSupportedByAll(browsers);
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          try {
            withTargetSupport(supportedFeatures, () =>
              mergeLonghands(css, placeShorthands, boxSupport, pairShorthands)
            );
          } finally {
            clearSupportCache();
          }
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
