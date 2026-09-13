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
import { reduceBorderSpacing } from './lib/decl/borderSpacingReducer.js';
import { reduceBorderRadius } from './lib/decl/borderRadiusReducer.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from './lib/decl/borderData.js';
import { isAll } from './lib/decl/importanceLanes.js';
import {
  foldableShorthands,
  foldShorthandDeclaration,
} from './lib/minifyShorthand.js';

/** @import {Container, Declaration, Rule} from 'postcss'; */

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
 * @param {Rule} rule
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
 *   borderSpacingDeclarations: Declaration[],
 *   hasForeignBorder: boolean,
 * }} state
 * @param {{
 *   columnRules: [Rule, Declaration[], [Declaration[], Declaration[]]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>
 * }} context
 * @return {void}
 */
function reduceClassifiedRule(rule, state, context) {
  if (state.marginDecls.length) {
    reduceBox(rule, 'margin', state.marginDecls, state.marginLanes);
  }
  if (state.paddingDecls.length) {
    reduceBox(rule, 'padding', state.paddingDecls, state.paddingLanes);
  }
  if (state.borderRadiusDecls.length) {
    reduceBorderRadius(rule, state.borderRadiusDecls, state.borderRadiusLanes);
  }
  if (state.borderSpacingDeclarations.length) {
    reduceBorderSpacing(rule, state.borderSpacingDeclarations);
  }
  if (state.borderDeclarations.length) {
    reduceBorder(rule, state.borderDeclarations, state.hasForeignBorder);
  }
  if (state.columnDecls.length) {
    context.columnRules.push([rule, state.columnDecls, state.columnLanes]);
  }
}

/**
 * Classifies declarations within a rule, runs box/border reducers, and tracks column candidates.
 * @param {Rule} rule
 * @param {{
 *   columnRules: [Rule, Declaration[], [Declaration[], Declaration[]]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>
 * }} context
 * @return {void}
 */
function processRule(rule, context) {
  const state = {
    /** @type {Declaration[]} */
    marginDecls: [],
    /** @type {[Declaration[], Declaration[]]} */
    marginLanes: [[], []],
    /** @type {Declaration[]} */
    paddingDecls: [],
    /** @type {[Declaration[], Declaration[]]} */
    paddingLanes: [[], []],
    /** @type {Declaration[]} */
    borderRadiusDecls: [],
    /** @type {[Declaration[], Declaration[]]} */
    borderRadiusLanes: [[], []],
    /** @type {Declaration[]} */
    columnDecls: [],
    /** @type {[Declaration[], Declaration[]]} */
    columnLanes: [[], []],
    /** @type {Declaration[]} */
    borderDeclarations: [],
    /** @type {Declaration[]} */
    borderSpacingDeclarations: [],
    hasForeignBorder: false,
  };

  for (const child of rule.nodes) {
    if (child.type !== 'decl') continue;
    const laneIndex = child.important ? 1 : 0;
    if (isAll(child)) {
      state.hasForeignBorder = true;
      state.marginLanes[laneIndex].push(child);
      state.paddingLanes[laneIndex].push(child);
      state.borderRadiusLanes[laneIndex].push(child);
      state.columnLanes[laneIndex].push(child);
      continue;
    }

    const prop = child.prop.toLowerCase();
    if (prop.startsWith('border')) {
      if (allRadiusProperties.has(prop)) {
        state.borderRadiusDecls.push(child);
        state.borderRadiusLanes[laneIndex].push(child);
      } else if (prop === 'border-spacing') {
        state.borderSpacingDeclarations.push(child);
      } else if (allPhysicalBorderProperties.has(prop)) {
        state.borderDeclarations.push(child);
      } else {
        state.hasForeignBorder = true;
      }
    } else if (prop.startsWith('column')) {
      context.setsOtherColumn ||= setsOtherColumnProperty(child);
      if (allColumnProps.has(prop)) {
        state.columnDecls.push(child);
        state.columnLanes[laneIndex].push(child);
      }
    } else if (prop.startsWith('margin')) {
      if (physicalMarginProperties.has(prop)) {
        state.marginDecls.push(child);
      }
      state.marginLanes[laneIndex].push(child);
    } else if (prop.startsWith('padding')) {
      if (physicalPaddingProperties.has(prop)) {
        state.paddingDecls.push(child);
      }
      state.paddingLanes[laneIndex].push(child);
    } else if (foldableShorthands.has(prop)) {
      foldShorthandDeclaration(child, context.shorthandMemoTable);
    }
  }

  reduceClassifiedRule(rule, state, context);
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-longhand',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const context = {
        /** @type {[Rule, Declaration[], [Declaration[], Declaration[]]][]} */
        columnRules: [],
        setsOtherColumn: false,
        shorthandMemoTable: new Map(),
      };

      foldContainerDeclarations(css, context.shorthandMemoTable);

      css.walk((node) => {
        if (node.type === 'rule') {
          processRule(node, context);
        } else if (node.type === 'atrule') {
          foldContainerDeclarations(node, context.shorthandMemoTable);
        }
      });

      if (!context.setsOtherColumn) {
        for (const [rule, decls, lanes] of context.columnRules)
          reduceColumns(rule, decls, lanes);
      }
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
