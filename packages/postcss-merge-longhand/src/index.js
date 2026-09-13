import {
  allColumnProps,
  reduceColumns,
  setsOtherColumnProperty,
} from './lib/decl/columns.js';
import { reduceBox } from './lib/decl/boxReducer.js';
import { reduceBorder } from './lib/decl/borderReducer.js';
import { reduceBorderSpacing } from './lib/decl/borderSpacingReducer.js';
import { reduceBorderRadius } from './lib/decl/borderRadiusReducer.js';
import { allRadiusProperties } from './lib/decl/borderData.js';
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
 * Classifies declarations within a rule, runs box/border reducers, and tracks column candidates.
 * @param {Rule} rule
 * @param {{
 *   columnRules: [Rule, Declaration[]][],
 *   setsOtherColumn: boolean,
 *   shorthandMemoTable: Map<string, string | null>
 * }} context
 * @return {void}
 */
function processRule(rule, context) {
  /** @type {Declaration[]} */
  const borderDeclarations = [];
  const borderSpacingDeclarations = /** @type {Declaration[]} */ ([]);
  const borderRadiusDeclarations = /** @type {Declaration[]} */ ([]);
  const marginDeclarations = /** @type {Declaration[]} */ ([]);
  const paddingDeclarations = /** @type {Declaration[]} */ ([]);
  /** @type {Declaration[] | undefined} */
  let columnDeclarations;

  for (const child of rule.nodes) {
    if (child.type !== 'decl') continue;
    const prop = child.prop.toLowerCase();
    if (prop.startsWith('border')) {
      if (allRadiusProperties.has(prop)) {
        borderRadiusDeclarations.push(child);
      } else if (prop === 'border-spacing') {
        borderSpacingDeclarations.push(child);
      } else {
        borderDeclarations.push(child);
      }
    } else if (prop.startsWith('column')) {
      context.setsOtherColumn ||= setsOtherColumnProperty(child);
      if (allColumnProps.has(prop)) {
        if (columnDeclarations) columnDeclarations.push(child);
        else columnDeclarations = [child];
      }
    } else if (prop.startsWith('margin')) {
      marginDeclarations.push(child);
    } else if (prop.startsWith('padding')) {
      paddingDeclarations.push(child);
    } else if (foldableShorthands.has(prop)) {
      foldShorthandDeclaration(child, context.shorthandMemoTable);
    }
  }

  if (marginDeclarations.length) reduceBox(rule, 'margin', marginDeclarations);
  if (paddingDeclarations.length)
    reduceBox(rule, 'padding', paddingDeclarations);
  if (borderRadiusDeclarations.length)
    reduceBorderRadius(rule, borderRadiusDeclarations);
  if (borderSpacingDeclarations.length)
    reduceBorderSpacing(rule, borderSpacingDeclarations);
  if (borderDeclarations.length) reduceBorder(rule, borderDeclarations);
  if (columnDeclarations) context.columnRules.push([rule, columnDeclarations]);
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
        /** @type {[Rule, Declaration[]][]} */
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
        for (const [rule, decls] of context.columnRules)
          reduceColumns(rule, decls);
      }
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
