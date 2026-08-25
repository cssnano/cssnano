import { isTokenIdent, tokenize } from '@csstools/css-tokenizer';
import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import cssnanoUtils from 'cssnano-utils';

const { sameParent } = cssnanoUtils;
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
 * Replace identifier tokens while preserving the source of surrounding
 * functions and blocks. In particular, quoted strings and URL tokens are not
 * identifiers even when their decoded value matches a replacement.
 *
 * @param {string} value
 * @param {(key: string) => string} resolve
 * @return {string}
 */
function replaceIdentifiers(value, resolve) {
  const nodes = parseListOfComponentValues(tokenize({ css: value }));

  /**
   * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
   * @return {string}
   */
  function serialize(values) {
    let output = '';

    for (const node of values) {
      if (isTokenNode(node)) {
        output += isTokenIdent(node.value)
          ? resolve(node.value[1])
          : node.toString();
        continue;
      }

      if (isFunctionNode(node) || isSimpleBlockNode(node)) {
        const source = node.toString();
        const inner = node.value.map((child) => child.toString()).join('');
        output += source.replace(inner, serialize(node.value));
        continue;
      }

      output += node.toString();
    }

    return output;
  }

  return serialize(nodes);
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
      decl.value = replaceIdentifiers(decl.value, canon);
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
