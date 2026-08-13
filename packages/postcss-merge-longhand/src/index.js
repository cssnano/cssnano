'use strict';
const borders = require('./lib/decl/borders.js');
const columns = require('./lib/decl/columns.js');
const margin = require('./lib/decl/margin.js');
const padding = require('./lib/decl/padding.js');
const { hasFallback } = require('./lib/isFallback.js');
const { rememberAuthoredValues } = require('./lib/authoredValues.js');

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
 * Exploding a shorthand is only a step towards merging it back together with
 * the longhands around it. Where a fallback stops that merge, the longhands
 * stay where explode left them, which takes more room than the shorthand they
 * came from and drops whatever else the shorthand reset. Undoing the pair
 * whenever it leaves the rule larger than it found it keeps both from
 * happening.
 *
 * @param {Rule} rule
 * @param {Family} family
 * @param {Declaration[]} declarations the ones the family covers
 * @return {void}
 */
function rewrite(rule, family, declarations) {
  if (!hasFallback(declarations)) {
    family.explode(rule);
    family.merge(rule);
    return;
  }

  const original = rule.nodes.map((node) => node.clone());
  const before = rule.toString().length;

  family.explode(rule);
  family.merge(rule);

  if (rule.toString().length > before) {
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
       * Whether a `columns` shorthand carries the same meaning as the longhands
       * it expands to depends on declarations elsewhere in the stylesheet, so
       * the family waits until the whole of it has been seen.
       *
       * @type {Rule[]}
       */
      const columnRules = [];
      let setsOtherColumnProperty = false;

      css.walkRules((rule) => {
        // Scan the rule's declarations once, then run only the processors whose
        // family is present.
        /** @type {Declaration[]} */
        const declarations = [];
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
          declarations.push(node);
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
        rememberAuthoredValues(rule, declarations);
        if (borderDeclarations.length) {
          rewrite(rule, borders, borderDeclarations);
        }
        if (hasColumn) {
          columnRules.push(rule);
        }
        if (marginDeclarations.length) {
          rewrite(rule, margin, marginDeclarations);
        }
        if (paddingDeclarations.length) {
          rewrite(rule, padding, paddingDeclarations);
        }
      });

      if (setsOtherColumnProperty) {
        return;
      }

      for (const rule of columnRules) {
        rewrite(rule, columns, declarationsNamed(rule, 'column'));
      }
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>} */ (
  pluginCreator
);
