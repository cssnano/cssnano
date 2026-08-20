'use strict';
const valueParser = require('postcss-value-parser');
const { sameParent } = require('cssnano-utils');

const keyframesRegex = /keyframes/i;
const animationRegex = /animation/i;
const counterStyleRegex = /counter-style/i;
const listStyleSystemRegex = /(list-style|system)/i;
/**
 * @param {Record<string, string>} obj
 * @return {(key: string) => string}
 */
function canonical(obj) {
  // Prevent potential infinite loops
  let stack = 50;

  /**
   * @param {string} key
   * @return {string}
   */
  return function recurse(key) {
    if (Object.hasOwn(obj, key) && obj[key] !== key && stack) {
      stack--;

      return recurse(obj[key]);
    }

    stack = 50;

    return key;
  };
}

/**
 * @param {import('postcss').Root} css
 * @return {void}
 */
function mergeAtRules(css) {
  const pairs = [
    {
      atrule: keyframesRegex,
      decl: animationRegex,
      /** @type {import('postcss').AtRule[]} */
      cache: [],
      replacements: {},
      /** @type {import('postcss').Declaration[]} */
      decls: [],
      /** @type {import('postcss').AtRule[]} */
      removals: [],
    },
    {
      atrule: counterStyleRegex,
      decl: listStyleSystemRegex,
      cache: [],
      replacements: {},
      decls: [],
      removals: [],
    },
  ];

  /**
   * @type {{atrule: RegExp, decl: RegExp, replacements: Record<string, string>, removals: import('postcss').AtRule[], cache: import('postcss').AtRule[], decls: import('postcss').Declaration[]} | undefined}
   */
  let relevant;

  css.walk((node) => {
    if (node.type === 'atrule') {
      relevant = pairs.find((pair) =>
        pair.atrule.test(node.name.toLowerCase())
      );

      if (!relevant) {
        return;
      }

      if (relevant.cache.length < 1) {
        relevant.cache.push(node);
        return;
      } else {
        const toString = node.nodes ? node.nodes.toString() : '';

        for (const cached of relevant.cache) {
          const cachedStringContent = cached.nodes
            ? cached.nodes.toString()
            : '';
          if (
            cached.name.toLowerCase() === node.name.toLowerCase() &&
            sameParent(cached, node) &&
            cachedStringContent === toString
          ) {
            relevant.removals.push(cached);
            relevant.replacements[cached.params] = node.params;
          }
        }

        relevant.cache.push(node);

        return;
      }
    }

    if (node.type === 'decl') {
      relevant = pairs.find((pair) => pair.decl.test(node.prop.toLowerCase()));

      if (!relevant) {
        return;
      }

      relevant.decls.push(node);
    }
  });

  for (const pair of pairs) {
    const canon = canonical(pair.replacements);

    for (const decl of pair.decls) {
      decl.value = valueParser(decl.value)
        .walk((node) => {
          if (node.type === 'word') {
            node.value = canon(node.value);
          }
        })
        .toString();
    }
    for (const cached of pair.removals) {
      cached.remove();
    }
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-idents',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      mergeAtRules(css);
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>} */ (
  pluginCreator
);
