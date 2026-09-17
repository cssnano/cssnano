import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';

const { sameParent } = cssnanoUtils;
const keyframesRegex = /keyframes/iv;
const animationRegex = /animation/iv;
const counterStyleRegex = /counter-style/iv;
const listStyleSystemRegex = /(?:list-style|system)/iv;
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
  /**
   * @typedef {{
   *   node: import('postcss').AtRule,
   *   body: string,
   * }} Candidate
   *
   * @typedef {{
   *   atrule: RegExp,
   *   decl: RegExp,
   *   cache: Candidate[],
   *   replacements: Record<string, string>,
   *   decls: import('postcss').Declaration[],
   *   removals: import('postcss').AtRule[],
   * }} Pair
   */

  /** @type {Pair[]} */
  const pairs = [
    {
      atrule: keyframesRegex,
      decl: animationRegex,
      cache: [],
      replacements: {},
      decls: [],
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

  /** @type {Pair | undefined} */
  let relevant;

  css.walk((node) => {
    if (node.type === 'atrule') {
      relevant = pairs.find((pair) =>
        pair.atrule.test(node.name.toLowerCase())
      );

      if (!relevant) {
        return;
      }

      const body = node.nodes ? node.nodes.toString() : '';

      for (const cached of relevant.cache) {
        if (
          cached.node.name.toLowerCase() === node.name.toLowerCase() &&
          sameParent(cached.node, node) &&
          cached.body === body
        ) {
          relevant.removals.push(cached.node);
          relevant.replacements[cached.node.params] = node.params;
        }
      }

      relevant.cache.push({ node, body });

      return;
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
      const value = decl.value;
      /** @type {[number, number, string, string][]} */ const replacements = [
        ...tokenize({ css: value }),
      ]
        .filter((token) => token[0] === TokenType.Ident)
        .map((token) => /** @type {[number, number, string, string]} */ ([
          token[2],
          token[3] + 1,
          canon(token[1]),
          token[1],
        ]))
        .filter(([, , replacement, original]) => replacement !== original);
      let result = value;
      for (const [start, end, replacement] of replacements.toReversed())
        result = result.slice(0, start) + replacement + result.slice(end);
      decl.value = result;
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
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
