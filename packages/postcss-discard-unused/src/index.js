import {
  isTokenComment,
  isTokenComma,
  isTokenDelim,
  isTokenIdent,
  isTokenWhitespace,
  tokenize,
} from '@csstools/css-tokenizer';

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const animationRegex = /animation/;
const listStyleRegex = /list-style|system/;
const fontRegex = /font(|-family)/;
const counterStyleRegex = /counter-style/;
const keyframesRegex = /keyframes/;
const wildcard = true;

/**
 * @param {{value: string}} arg
 * @param {(input: string) => string[]} comma
 * @param {(input: string) => string[]} space
 * @return {string[]}
 */
function splitValues({ value }, comma, space) {
  /** @type {string[]} */
  let result = [];
  for (const val of comma(value)) {
    result = result.concat(space(val));
  }
  return result;
}

/**
 * @param {{atRules: import('postcss').AtRule[], values: string[]}} arg
 * @return {void}
 */
function filterAtRule({ atRules, values }) {
  const uniqueValues = new Set(values);
  for (const node of atRules) {
    const hasAtRule = uniqueValues.has(node.params);

    if (!hasAtRule) {
      node.remove();
    }
  }
}

/**
 * @param {string} source
 * @return {string | true | undefined}
 */
function namespacePrefix(source) {
  for (const token of tokenize({ css: source })) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    return namespacePrefixToken(token);
  }
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken | undefined} token
 * @return {string | true | undefined}
 */
function namespacePrefixToken(token) {
  if (token === undefined) return;
  if (isTokenIdent(token)) return token[4].value;
  if (isTokenDelim(token) && token[1] === '*') return wildcard;
}

/**
 * Find namespace prefixes in each selector-list item. A comma resets the
 * candidate prefix so a type selector in an earlier item cannot be mistaken
 * for the prefix of a later qualified selector. Intervening whitespace or
 * comments also reset the candidate prefix because CSS qualified names cannot
 * contain whitespace between the prefix, '|', and the element/attribute name.
 *
 * @param {string} source
 * @return {(string | true)[]}
 */
function namespacePrefixes(source) {
  /** @type {(string | true)[]} */
  const prefixes = [];
  /** @type {import('@csstools/css-tokenizer').CSSToken | undefined} */
  let previous;
  /** @type {string | true | undefined} */
  let pendingPrefix;

  for (const token of tokenize({ css: source })) {
    if (isTokenComma(token)) {
      previous = undefined;
      pendingPrefix = undefined;
      continue;
    }
    if (isTokenWhitespace(token) || isTokenComment(token)) {
      previous = undefined;
      pendingPrefix = undefined;
      continue;
    }

    if (pendingPrefix !== undefined) {
      if (isTokenIdent(token) || (isTokenDelim(token) && token[1] === '*')) {
        prefixes.push(pendingPrefix);
      }
      pendingPrefix = undefined;
    }

    if (isTokenDelim(token) && token[1] === '|') {
      pendingPrefix = namespacePrefixToken(previous);
      previous = undefined;
      continue;
    }

    previous = token;
  }

  return prefixes;
}

/**
 * @param {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} arg
 * @return {void}
 */
function filterNamespace({ atRules, rules }) {
  const uniqueRules = new Set(rules);
  for (const atRule of atRules) {
    const prefix = namespacePrefix(atRule.params);

    if (prefix === undefined) {
      if (atRule.params.trim()) continue;
      atRule.remove();
      continue;
    }

    const hasRule = uniqueRules.has(prefix) || uniqueRules.has(wildcard);

    if (!hasRule) {
      atRule.remove();
    }
  }
}

/**
 * @param {string} fontFamily
 * @param {string[]} cache
 * @param {(input: string) => string[]} comma
 * @return {boolean}
 */
function hasFont(fontFamily, cache, comma) {
  return comma(fontFamily).some((font) => cache.some((c) => c.includes(font)));
}

/**
 * fonts have slightly different logic

 * @param {{atRules: import('postcss').AtRule[], values: string[]}} cache
 * @param {(input: string) => string[]} comma
 * @return {void}
 */
function filterFont({ atRules, values }, comma) {
  const uniqueValues = [...new Set(values)];
  for (const r of atRules) {
    if (r.nodes !== undefined) {
      /** @type {import('postcss').Declaration[]} */
      const families = /** @type {import('postcss').Declaration[]} */ (
        r.nodes.filter(
          (node) => node.type === 'decl' && node.prop === 'font-family'
        )
      );

      // Discard the @font-face if it has no font-family
      if (families.length === 0) {
        r.remove();
      }

      for (const family of families) {
        if (!hasFont(family.value.toLowerCase(), uniqueValues, comma)) {
          r.remove();
        }
      }
    }
  }
}

/**@typedef {{fontFace?: boolean, counterStyle?: boolean, keyframes?: boolean, namespace?: boolean}} Options */

/**
 * @param {import('postcss').AnyNode} node
 * @param {{
 *   fontFace: boolean,
 *   counterStyle: boolean,
 *   keyframes: boolean,
 *   namespace: boolean,
 *   counterStyleCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   keyframesCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   namespaceCache: {atRules: import('postcss').AtRule[], rules: (string | true)[]},
 *   fontCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   comma: (input: string) => string[],
 *   space: (input: string) => string[],
 * }} context
 * @return {void}
 */
function processNode(node, context) {
  if (node.type === rule && context.namespace && node.selector.includes('|')) {
    processRule(context.namespaceCache, node);
    return;
  }

  if (node.type === decl) {
    processDeclaration(node, context);
    return;
  }

  if (node.type === atrule) {
    processAtRule(node, context);
  }
}

/**
 * @param {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} namespaceCache
 * @param {import('postcss').Rule} node
 * @return {void}
 */
function processRule(namespaceCache, node) {
  for (const prefix of namespacePrefixes(node.selector)) {
    namespaceCache.rules.push(prefix);
  }
}

/**
 * @param {import('postcss').Declaration} node
 * @param {{
 *   fontFace: boolean,
 *   counterStyle: boolean,
 *   keyframes: boolean,
 *   namespace: boolean,
 *   counterStyleCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   keyframesCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   namespaceCache: {atRules: import('postcss').AtRule[], rules: (string | true)[]},
 *   fontCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   comma: (input: string) => string[],
 *   space: (input: string) => string[],
 * }} context
 * @return {void}
 */
function processDeclaration(node, context) {
  const { prop } = node;
  if (context.counterStyle && listStyleRegex.test(prop)) {
    context.counterStyleCache.values = context.counterStyleCache.values.concat(
      splitValues(node, context.comma, context.space)
    );
  }

  if (
    context.fontFace &&
    node.parent !== undefined &&
    node.parent.type === rule &&
    fontRegex.test(prop)
  ) {
    context.fontCache.values = context.fontCache.values.concat(
      context.comma(node.value.toLowerCase())
    );
  }

  if (context.keyframes && animationRegex.test(prop)) {
    context.keyframesCache.values = context.keyframesCache.values.concat(
      splitValues(node, context.comma, context.space)
    );
  }
}

/**
 * @param {import('postcss').AtRule} node
 * @param {{
 *   fontFace: boolean,
 *   counterStyle: boolean,
 *   keyframes: boolean,
 *   namespace: boolean,
 *   counterStyleCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   keyframesCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   namespaceCache: {atRules: import('postcss').AtRule[], rules: (string | true)[]},
 *   fontCache: {atRules: import('postcss').AtRule[], values: string[]},
 *   comma: (input: string) => string[],
 *   space: (input: string) => string[],
 * }} context
 * @return {void}
 */
function processAtRule(node, context) {
  const { name } = node;
  if (context.counterStyle && counterStyleRegex.test(name)) {
    context.counterStyleCache.atRules.push(node);
  }

  if (context.fontFace && name === 'font-face' && node.nodes) {
    context.fontCache.atRules.push(node);
  }

  if (context.keyframes && keyframesRegex.test(name)) {
    context.keyframesCache.atRules.push(node);
  }

  if (context.namespace && name === 'namespace') {
    context.namespaceCache.atRules.push(node);
  }
}

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  const { fontFace, counterStyle, keyframes, namespace } = Object.assign(
    {},
    {
      fontFace: true,
      counterStyle: true,
      keyframes: true,
      namespace: true,
    },
    opts
  );

  return {
    postcssPlugin: 'postcss-discard-unused',

    prepare() {
      /** @type {{atRules: import('postcss').AtRule[], values: string[]}} */
      const counterStyleCache = { atRules: [], values: [] };
      /** @type {{atRules: import('postcss').AtRule[], values: string[]}} */
      const keyframesCache = { atRules: [], values: [] };
      /** @type {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} */
      const namespaceCache = { atRules: [], rules: [] };
      /** @type {{atRules: import('postcss').AtRule[], values: string[]}} */
      const fontCache = { atRules: [], values: [] };

      return {
        /**
         * @param {import('postcss').Root} css
         * @param {import('postcss').Helpers} helpers
         */
        OnceExit(css, { list }) {
          const { comma, space } = list;
          const context = {
            fontFace,
            counterStyle,
            keyframes,
            namespace,
            counterStyleCache,
            keyframesCache,
            namespaceCache,
            fontCache,
            comma,
            space,
          };
          css.walk((node) => {
            processNode(node, context);
          });

          if (counterStyle) {
            filterAtRule(counterStyleCache);
          }
          if (fontFace) {
            filterFont(fontCache, comma);
          }
          if (keyframes) {
            filterAtRule(keyframesCache);
          }
          if (namespace) {
            filterNamespace(namespaceCache);
          }
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
