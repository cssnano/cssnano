import borders from './lib/decl/borders.js';
import {
  allColumnProps,
  reduceColumns,
  setsOtherColumnProperty,
} from './lib/decl/columns.js';
import { reduceBox } from './lib/decl/boxReducer.js';
import { isConcreteBorder, reduceBorder } from './lib/decl/borderReducer.js';
import { reduceBorderRadius } from './lib/decl/borderRadiusReducer.js';
import { allRadiusProperties } from './lib/decl/borderData.js';
import minifyShorthandIdentities from './lib/minifyShorthand.js';
import { requiredSupport } from './lib/isFallback.js';

/** @import {Declaration, Rule} from 'postcss'; */

/**
 * @param {Rule} rule
 * @return {number} what the border family's declarations take up, `:`, `;` and
 * `!important` included
 */
function familySize(rule) {
  let total = 0;
  for (const node of rule.nodes) {
    if (node.type === 'decl' && node.prop.toLowerCase().startsWith('border')) {
      total += node.prop.length + node.value.length + (node.important ? 12 : 2);
    }
  }
  return total;
}

/**
 * Merge border longhands into shorthand. Revert to original if longhands have
 * special applicability rules and don't fully merge, or if size increases.
 *
 * @param {Rule} rule
 * @param {Declaration[]} declarations the ones the family covers
 * @return {void}
 */
function rewrite(rule, declarations) {
  if (!mayRewrite(declarations)) return;

  const original = rule.nodes.map((node) => node.clone());
  const before = new Set(rule.nodes);
  const size = familySize(rule);

  borders.explode(rule);

  const created = rule.nodes.filter((node) => !before.has(node));

  borders.merge(rule);

  // Longhands with special applicability rules require all nodes to
  // round-trip; if any remain unconsumed after merge, the rewrite is
  // invalid and must revert.
  const strayed =
    declarations.some((decl) => requiredSupport(decl).size) &&
    created.some((node) => node.parent);

  if (strayed || familySize(rule) > size) {
    rule.removeAll();
    rule.append(...original);
  }
}

/**
 * A singleton longhand cannot be merged or cleaned up. Avoid cloning its rule
 * when the family has no other single-declaration transform for it.
 *
 * @param {Declaration[]} declarations
 * @return {boolean}
 */
const mayRewrite = (declarations) =>
  declarations.length > 1 ||
  /^(?:border|border-(?:top|right|bottom|left|width|style|color|spacing))$/.test(
    declarations[0].prop.toLowerCase()
  );

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
       /**
       * @type {[Rule, Declaration[]][]}
       */
      const columnRules = [];
      let setsOtherColumn = false;

      css.walkRules((rule) => {
        /** @type {Declaration[]} */
        const borderDeclarations = [];
        const borderRadiusDeclarations = /** @type {Declaration[]} */ ([]);
        const marginDeclarations = /** @type {Declaration[]} */ ([]);
        const paddingDeclarations = /** @type {Declaration[]} */ ([]);
        /** @type {Declaration[] | undefined} */
        let columnDeclarations;

        for (const node of rule.nodes) {
          if (node.type !== 'decl') continue;
          const prop = node.prop.toLowerCase();
          if (prop.startsWith('border')) {
            (allRadiusProperties.has(prop)
              ? borderRadiusDeclarations
              : borderDeclarations
            ).push(node);
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
          }
        }

        if (marginDeclarations.length)
          reduceBox(rule, 'margin', marginDeclarations);
        if (paddingDeclarations.length)
          reduceBox(rule, 'padding', paddingDeclarations);
        if (borderRadiusDeclarations.length)
          reduceBorderRadius(rule, borderRadiusDeclarations);
        if (borderDeclarations.length) {
          if (isConcreteBorder(rule, borderDeclarations))
            reduceBorder(rule, borderDeclarations);
          else rewrite(rule, borderDeclarations);
        }
        if (columnDeclarations) columnRules.push([rule, columnDeclarations]);
      });

      if (!setsOtherColumn) {
        for (const [rule, decls] of columnRules) reduceColumns(rule, decls);
      }

      minifyShorthandIdentities(css);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
