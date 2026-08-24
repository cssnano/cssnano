import selectorParser from 'postcss-selector-parser';

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const animationRegex = /animation/;
const listStyleRegex = /list-style|system/;
const fontRegex = /font(|-family)/;
const counterStyleRegex = /counter-style/;
const keyframesRegex = /keyframes/;

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
 * @param {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} arg
 * @return {void}
 */
function filterNamespace({ atRules, rules }) {
  const uniqueRules = new Set(rules);
  for (const atRule of atRules) {
    const { 0: param, length: len } = atRule.params.split(' ').filter(Boolean);

    if (len === 1) {
      return;
    }

    const hasRule = uniqueRules.has(param) || uniqueRules.has('*');

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

/**
 *
 * @param {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} namespaceCache
 * @param {import('postcss').Rule} node
 * @return {void}
 */
function processAttributeSelector(namespaceCache, node) {
  selectorParser((ast) => {
    ast.walkAttributes(({ namespace: ns }) => {
      namespaceCache.rules = namespaceCache.rules.concat(ns);
    });
  }).process(node.selector);
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
  if (node.selector.includes('[')) {
    // Attribute selector, so we should parse further.
    processAttributeSelector(namespaceCache, node);
  } else {
    // Use a simple split function for the namespace
    namespaceCache.rules = namespaceCache.rules.concat(
      node.selector.split('|')[0]
    );
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
