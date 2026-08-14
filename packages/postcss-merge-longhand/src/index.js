'use strict';
const borders = require('./lib/decl/borders.js');
const columns = require('./lib/decl/columns.js');
const margin = require('./lib/decl/margin.js');
const padding = require('./lib/decl/padding.js');
const { requiredSupport } = require('./lib/isFallback.js');

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
        // Scan the rule's declarations once, then run only the processors whose
        // family is present.
        /** @type {Declaration[]} */
        const borderDeclarations = [];
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
            borderDeclarations.push(node);
          } else if (prop.startsWith('column')) {
            hasColumn = true;
            setsOtherColumnProperty ||= columns.setsOtherColumnProperty(node);
          } else if (prop.startsWith('margin')) {
            marginDeclarations.push(node);
          } else if (prop.startsWith('padding')) {
            paddingDeclarations.push(node);
          }
        }
        if (borderDeclarations.length) {
          rewrite(rule, borders, 'border', borderDeclarations);
        }
        if (hasColumn) {
          columnRules.push(rule);
        }
        if (marginDeclarations.length) {
          rewrite(rule, margin, 'margin', marginDeclarations);
        }
        if (paddingDeclarations.length) {
          rewrite(rule, padding, 'padding', paddingDeclarations);
        }
      });

      if (setsOtherColumnProperty) {
        return;
      }

      for (const rule of columnRules) {
        rewrite(rule, columns, 'column', declarationsNamed(rule, 'column'));
      }
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>} */ (
  pluginCreator
);
