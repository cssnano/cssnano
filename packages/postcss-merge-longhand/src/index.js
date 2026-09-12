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

/** @import {Declaration, Rule} from 'postcss'; */

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
      /**
       * Whether expanding a `columns` shorthand produces equivalent computed
       * values depends on declarations elsewhere in the stylesheet, so the
       * column family's merge is deferred until all declarations have been seen.
       * @type {[Rule, Declaration[]][]}
       */
      const columnRules = [];
      let setsOtherColumn = false;
      /**
       * Memoization table for identity-folding evaluations across rules.
       * Scoped strictly to this stylesheet pass.
       * @type {Map<string, string | null>}
       */
      const shorthandMemoTable = new Map();

      css.walkRules((rule) => {
        /** @type {Declaration[]} */
        const borderDeclarations = [];
        const borderSpacingDeclarations = /** @type {Declaration[]} */ ([]);
        const borderRadiusDeclarations = /** @type {Declaration[]} */ ([]);
        const marginDeclarations = /** @type {Declaration[]} */ ([]);
        const paddingDeclarations = /** @type {Declaration[]} */ ([]);
        /** @type {Declaration[] | undefined} */
        let columnDeclarations;

        for (const node of rule.nodes) {
          if (node.type !== 'decl') continue;
          const prop = node.prop.toLowerCase();
          if (prop.startsWith('border')) {
            if (allRadiusProperties.has(prop)) {
              borderRadiusDeclarations.push(node);
            } else if (prop === 'border-spacing') {
              borderSpacingDeclarations.push(node);
            } else {
              borderDeclarations.push(node);
            }
          } else if (prop.startsWith('column')) {
            setsOtherColumn ||= setsOtherColumnProperty(node);
            if (allColumnProps.has(prop)) {
              if (columnDeclarations) columnDeclarations.push(node);
              else columnDeclarations = [node];
            }
          } else if (prop.startsWith('margin')) {
            marginDeclarations.push(node);
          } else if (prop.startsWith('padding')) {
            paddingDeclarations.push(node);
          } else if (foldableShorthands.has(prop)) {
            foldShorthandDeclaration(node, shorthandMemoTable);
          }
        }

        if (marginDeclarations.length)
          reduceBox(rule, 'margin', marginDeclarations);
        if (paddingDeclarations.length)
          reduceBox(rule, 'padding', paddingDeclarations);
        if (borderRadiusDeclarations.length)
          reduceBorderRadius(rule, borderRadiusDeclarations);
        if (borderSpacingDeclarations.length)
          reduceBorderSpacing(rule, borderSpacingDeclarations);
        if (borderDeclarations.length) reduceBorder(rule, borderDeclarations);
        if (columnDeclarations) columnRules.push([rule, columnDeclarations]);
      });

      if (!setsOtherColumn) {
        for (const [rule, decls] of columnRules) reduceColumns(rule, decls);
      }

      if (css.nodes) {
        for (const node of css.nodes) {
          if (
            node.type === 'decl' &&
            foldableShorthands.has(node.prop.toLowerCase())
          ) {
            foldShorthandDeclaration(node, shorthandMemoTable);
          }
        }
      }

      css.walkAtRules((atRule) => {
        if (!atRule.nodes) return;
        for (const node of atRule.nodes) {
          if (
            node.type === 'decl' &&
            foldableShorthands.has(node.prop.toLowerCase())
          ) {
            foldShorthandDeclaration(node, shorthandMemoTable);
          }
        }
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
