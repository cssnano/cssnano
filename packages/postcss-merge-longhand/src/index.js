import borders from './lib/decl/borders.js';
import columns from './lib/decl/columns.js';
import { reduceBox } from './lib/decl/boxReducer.js';
import { isConcreteBorder, reduceBorder } from './lib/decl/borderReducer.js';
import { reduceBorderRadius } from './lib/decl/borderRadiusReducer.js';
import { allRadiusProperties } from './lib/decl/borderData.js';
import minifyShorthandIdentities from './lib/minifyShorthand.js';
import { requiredSupport } from './lib/isFallback.js';

/** @import {Declaration, Rule} from 'postcss'; */

/**
 * @typedef {object} Family
 * @property {(rule: Rule) => void} explode
 * @property {(rule: Rule) => void} merge
 */

/**
 * @param {Rule} rule
 * @param {string} prefix
 * @return {Declaration[]}
 */
function declarationsNamed(rule, prefix) {
  /** @type {Declaration[]} */
  const declarations = [];

  for (const node of rule.nodes) {
    if (node.type === 'decl' && node.prop.toLowerCase().startsWith(prefix)) {
      declarations.push(node);
    }
  }

  return declarations;
}

/**
 * @param {Rule} rule
 * @param {string} prefix the family's properties all start with it
 * @return {number} what the family's declarations take up, `:`, `;` and
 * `!important` included
 */
function familySize(rule, prefix) {
  let total = 0;

  for (const node of rule.nodes) {
    if (node.type === 'decl' && node.prop.toLowerCase().startsWith(prefix)) {
      total +=
        node.prop.length + node.value.length + 2 + (node.important ? 10 : 0);
    }
  }

  return total;
}

/**
 * Merge longhands into shorthand. Revert to original if longhands have
 * special applicability rules and don't fully merge, or if size increases.
 *
 * @param {Rule} rule
 * @param {Family} family
 * @param {string} prefix the family's properties all start with it
 * @param {Declaration[]} declarations the ones the family covers
 * @return {void}
 */
function rewrite(rule, family, prefix, declarations) {
  if (!mayRewrite(prefix, declarations)) {
    return;
  }

  const original = rule.nodes.map((node) => node.clone());
  const before = new Set(rule.nodes);
  const size = familySize(rule, prefix);

  family.explode(rule);

  const created = rule.nodes.filter((node) => !before.has(node));

  family.merge(rule);

  // Longhands with special applicability rules require all nodes to
  // round-trip; if any remain unconsumed after merge, the rewrite is
  // invalid and must revert.
  const strayed =
    declarations.some((decl) => requiredSupport(decl).size) &&
    created.some((node) => node.parent);

  if (strayed || familySize(rule, prefix) > size) {
    rule.removeAll();
    rule.append(...original);
  }
}

/**
 * A singleton longhand cannot be merged or cleaned up. Avoid cloning its rule
 * when the family has no other single-declaration transform for it.
 *
 * @param {string} prefix
 * @param {Declaration[]} declarations
 * @return {boolean}
 */
function mayRewrite(prefix, declarations) {
  if (declarations.length > 1) {
    return true;
  }

  const prop = declarations[0].prop.toLowerCase();
  if (prefix === 'border') {
    return /^(?:border|border-(?:top|right|bottom|left|width|style|color|spacing))$/.test(
      prop
    );
  }

  return prop === prefix || prop === `${prefix}s`;
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
      /**
       * Whether expanding a `columns` shorthand produces equivalent computed
       * values depends on declarations elsewhere in the stylesheet, so the
       * column family's merge is deferred until all declarations have been seen.
       *
       * @type {Rule[]}
       */
      const columnRules = [];
      let setsOtherColumnProperty = false;

      css.walkRules((rule) => {
        /** @type {Declaration[]} */
        const borderDeclarations = [];
        /** @type {Declaration[]} */
        const borderRadiusDeclarations = [];
        /** @type {Declaration[]} */
        const marginDeclarations = [];
        /** @type {Declaration[]} */
        const paddingDeclarations = [];
        let hasColumn = false;

        for (const node of rule.nodes) {
          if (node.type !== 'decl') {
            continue;
          }
          const prop = node.prop.toLowerCase();
          if (prop.startsWith('border')) {
            if (allRadiusProperties.has(prop)) {
              borderRadiusDeclarations.push(node);
            } else {
              borderDeclarations.push(node);
            }
          } else if (prop.startsWith('column')) {
            hasColumn = true;
            setsOtherColumnProperty ||= columns.setsOtherColumnProperty(node);
          } else if (prop.startsWith('margin')) {
            marginDeclarations.push(node);
          } else if (prop.startsWith('padding')) {
            paddingDeclarations.push(node);
          }
        }

        if (marginDeclarations.length) {
          reduceBox(rule, 'margin', marginDeclarations);
        }
        if (paddingDeclarations.length) {
          reduceBox(rule, 'padding', paddingDeclarations);
        }
        if (borderRadiusDeclarations.length) {
          reduceBorderRadius(rule, borderRadiusDeclarations);
        }
        if (borderDeclarations.length) {
          if (isConcreteBorder(rule, borderDeclarations)) {
            reduceBorder(rule, borderDeclarations);
          } else {
            rewrite(rule, borders, 'border', borderDeclarations);
          }
        }
        if (hasColumn) {
          columnRules.push(rule);
        }
      });

      if (!setsOtherColumnProperty) {
        for (const rule of columnRules) {
          rewrite(rule, columns, 'column', declarationsNamed(rule, 'column'));
        }
      }

      minifyShorthandIdentities(css);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
