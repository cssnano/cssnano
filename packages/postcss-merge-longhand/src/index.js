'use strict';
const processors = require('./lib/decl');
const [borders, columns, margin, padding] = processors;

/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-longhand',

    OnceExit(css) {
      css.walkRules((rule) => {
        // Most rules only touch one (or zero) of the four prop families this
        // plugin handles, so pre-scan once and skip the processors that have
        // nothing to do — saves their walkDecls + getDecls passes.
        const nodes = rule.nodes;
        let mask = 0;
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node.type !== 'decl') {
            continue;
          }
          const prop = node.prop;
          // Most CSS in the wild has lowercase props, so the
          // case-sensitive startsWith short-circuit avoids the toLowerCase
          // allocation on the common path; the case-insensitive fallback
          // only runs when the first byte already mismatches.
          if (
            (mask & 1) === 0 &&
            (prop.startsWith('border') ||
              prop.toLowerCase().startsWith('border'))
          ) {
            mask |= 1;
          }
          if (
            (mask & 2) === 0 &&
            (prop.startsWith('column') ||
              prop.toLowerCase().startsWith('column'))
          ) {
            mask |= 2;
          }
          if (
            (mask & 4) === 0 &&
            (prop.startsWith('margin') ||
              prop.toLowerCase().startsWith('margin'))
          ) {
            mask |= 4;
          }
          if (
            (mask & 8) === 0 &&
            (prop.startsWith('padding') ||
              prop.toLowerCase().startsWith('padding'))
          ) {
            mask |= 8;
          }
        }
        if (mask === 0) {
          return;
        }
        if (mask & 1) {
          borders.explode(rule);
          borders.merge(rule);
        }
        if (mask & 2) {
          columns.explode(rule);
          columns.merge(rule);
        }
        if (mask & 4) {
          margin.explode(rule);
          margin.merge(rule);
        }
        if (mask & 8) {
          padding.explode(rule);
          padding.merge(rule);
        }
      });
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
