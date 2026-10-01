import {
  allColumnProps,
  reduceColumns,
  setsOtherColumnProperty,
} from './lib/decl/columns.js';
import {
  physicalMarginProperties,
  physicalPaddingProperties,
  reduceBox,
} from './lib/decl/boxReducer.js';
import { reduceBorder } from './lib/decl/borderReducer.js';
import { reduceBorderRadius } from './lib/decl/borderRadiusReducer.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from './lib/decl/borderData.js';
import getBrowsersList from '#getBrowsersList';
import {
  alignmentFamilies,
  alignmentProperties,
} from './lib/decl/alignmentForms.js';
import { reduceAlignmentFamily } from './lib/decl/alignmentReducer.js';
import { supportsPlaceShorthands } from './lib/decl/placeSupport.js';
import { endsDeclarationRun } from './lib/decl/declarationRuns.js';
import { decodedPropertyName, isAll } from './lib/decl/importanceLanes.js';
import {
  foldableShorthands,
  foldShorthandDeclaration,
} from './lib/minifyShorthand.js';

/** @import {Container, Declaration} from 'postcss'; */
/** @import browserslist from 'browserslist' */

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

const vendorPrefix = /^-(?:webkit|moz|ms)-/v;

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
    : alignmentProperties.get(name.replace(vendorPrefix, ''));
}

/** @typedef {{ decls: Declaration[], lanes: [Declaration[], Declaration[]] }} AlignmentDeclarations */

/**
 * Folds immediate shorthand declarations within a container (e.g. root or at-rule).
 * @param {Container} container
 * @param {Map<string, string | null>} shorthandMemoTable
 * @return {void}
 */
function foldContainerDeclarations(container, shorthandMemoTable) {
  if (!container.nodes) return;
  for (const node of container.nodes) {
    if (
      node.type === 'decl' &&
      foldableShorthands.has(node.prop.toLowerCase())
    ) {
      foldShorthandDeclaration(node, shorthandMemoTable);
    }
  }
}

/**
 * Runs property-family reducers on classified declarations for a container.
 * @param {Container} container
 * @param {{
 *   marginDecls: Declaration[],
 *   marginLanes: [Declaration[], Declaration[]],
 *   paddingDecls: Declaration[],
 *   paddingLanes: [Declaration[], Declaration[]],
 *   borderRadiusDecls: Declaration[],
 *   borderRadiusLanes: [Declaration[], Declaration[]],
 *   columnDecls: Declaration[],
 *   columnLanes: [Declaration[], Declaration[]],
 *   borderDeclarations: Declaration[],
 *   hasForeignBorder: boolean,
 *   alignmentFamilies: Map<string, AlignmentDeclarations> | null,
 * }} state
 * @param {{
 *   columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>,
 *   placeShorthands: boolean
 * }} context
 * @return {void}
 */
function reduceClassifiedContainer(container, state, context) {
  if (state.marginDecls.length) {
    reduceBox(container, 'margin', state.marginDecls, state.marginLanes);
  }
  if (state.paddingDecls.length) {
    reduceBox(container, 'padding', state.paddingDecls, state.paddingLanes);
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
  if (state.alignmentFamilies) {
    for (const [shorthand, { decls, lanes }] of state.alignmentFamilies) {
      reduceAlignmentFamily(
        container,
        alignmentFamilies[shorthand],
        decls,
        lanes
      );
    }
  }
  if (state.columnDecls.length) {
    context.columnRules.push([container, state.columnDecls, state.columnLanes]);
  }
}

/**
 * Classifies a single declaration into the container accumulation state.
 *
 * @param {Declaration} child
 * @param {string} prop
 * @param {number} laneIndex
 * @param {Parameters<typeof reduceClassifiedContainer>[1]} state
 * @param {{
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>,
 *   placeShorthands: boolean
 * }} context
 * @return {void}
 */
function classifyDeclaration(child, prop, laneIndex, state, context) {
  if (prop.startsWith('border')) {
    if (allRadiusProperties.has(prop)) {
      state.borderRadiusDecls.push(child);
      state.borderRadiusLanes[laneIndex].push(child);
    } else if (allPhysicalBorderProperties.has(prop)) {
      state.borderDeclarations.push(child);
    } else if (foldableShorthands.has(prop)) {
      foldShorthandDeclaration(child, context.shorthandMemoTable);
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
  if (prop.startsWith('margin')) {
    if (physicalMarginProperties.has(prop)) {
      state.marginDecls.push(child);
    }
    state.marginLanes[laneIndex].push(child);
    return;
  }
  if (prop.startsWith('padding')) {
    if (physicalPaddingProperties.has(prop)) {
      state.paddingDecls.push(child);
    }
    state.paddingLanes[laneIndex].push(child);
    return;
  }
  // Only when every target supports place-* may one be synthesized.
  const alignmentFamily = context.placeShorthands
    ? alignmentFamilyOf(prop)
    : undefined;
  if (foldableShorthands.has(prop)) {
    foldShorthandDeclaration(child, context.shorthandMemoTable);
  }
  if (alignmentFamily) {
    state.alignmentFamilies ??= new Map();
    let family = state.alignmentFamilies.get(alignmentFamily.shorthand);
    if (!family) {
      family = { decls: [], lanes: [[], []] };
      state.alignmentFamilies.set(alignmentFamily.shorthand, family);
    }
    family.decls.push(child);
    family.lanes[laneIndex].push(child);
  }
}

/**
 * @return {Parameters<typeof reduceClassifiedContainer>[1]}
 */
function createContainerState() {
  return {
    marginDecls: [],
    marginLanes: [[], []],
    paddingDecls: [],
    paddingLanes: [[], []],
    borderRadiusDecls: [],
    borderRadiusLanes: [[], []],
    columnDecls: [],
    columnLanes: [[], []],
    borderDeclarations: [],
    hasForeignBorder: false,
    alignmentFamilies: null,
  };
}

/**
 * Classifies declarations within a container, runs reducers, and tracks column candidates.
 * @param {Container} container
 * @param {{
 *   columnRules: [Container, Declaration[], [Declaration[], Declaration[]]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>,
 *   placeShorthands: boolean
 * }} context
 * @return {void}
 */
function processContainer(container, context) {
  if (!container.nodes) return;

  let state = createContainerState();
  for (const child of container.nodes) {
    // Declarations after a nested rule cascade after its declarations, so a
    // shorthand merged across it would override them.
    if (endsDeclarationRun(child)) {
      reduceClassifiedContainer(container, state, context);
      state = createContainerState();
      continue;
    }
    if (child.type !== 'decl') continue;
    const laneIndex = child.important ? 1 : 0;
    if (isAll(child)) {
      state.hasForeignBorder = true;
      state.marginLanes[laneIndex].push(child);
      state.paddingLanes[laneIndex].push(child);
      state.borderRadiusLanes[laneIndex].push(child);
      state.columnLanes[laneIndex].push(child);
      for (const family of state.alignmentFamilies?.values() ?? []) {
        family.lanes[laneIndex].push(child);
      }
      continue;
    }

    classifyDeclaration(
      child,
      child.prop.toLowerCase(),
      laneIndex,
      state,
      context
    );
  }

  reduceClassifiedContainer(container, state, context);
}

/**
 * @param {import('postcss').Root} css
 * @param {boolean} placeShorthands
 * @return {void}
 */
function mergeLonghands(css, placeShorthands) {
  const context = {
    /** @type {[Container, Declaration[], [Declaration[], Declaration[]]][]} */
    columnRules: [],
    setsOtherColumn: false,
    /** @type {Map<string, string | null>} */
    shorthandMemoTable: new Map(),
    placeShorthands,
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
      const placeShorthands = supportsPlaceShorthands(
        getBrowsersList(opts, stats, from, file, env)
      );
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          mergeLonghands(css, placeShorthands);
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
