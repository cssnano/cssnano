'use strict';
const valueParser = require('postcss-value-parser');
const mappings = require('./lib/map');

const repeatPropertyRegex = /^(background(-repeat)?|(-\w+-)?mask-repeat)$/i;
/**
 * @param {unknown} item
 * @param {number} index
 * @return {boolean}
 */
function evenValues(item, index) {
  return index % 2 === 0;
}

const repeatKeywords = new Set(mappings.values());

/**
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isCommaNode(node) {
  return node.type === 'div' && node.value === ',';
}

const variableFunctions = new Set(['var', 'env', 'constant']);
/**
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isVariableFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return variableFunctions.has(node.value.toLowerCase());
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const parsed = valueParser(value);

  if (parsed.nodes.length === 1) {
    return value;
  }
  /** @type {{start: number?, end: number?}[]} */
  const ranges = [];
  let rangeIndex = 0;
  let shouldContinue = true;

  for (const [index, node] of parsed.nodes.entries()) {
    // After comma (`,`) follows next background
    if (isCommaNode(node)) {
      rangeIndex += 1;
      shouldContinue = true;

      continue;
    }

    if (!shouldContinue) {
      continue;
    }

    // After separator (`/`) follows `background-size` values
    // Avoid them
    if (node.type === 'div' && node.value === '/') {
      shouldContinue = false;

      continue;
    }

    if (!ranges[rangeIndex]) {
      ranges[rangeIndex] = {
        start: null,
        end: null,
      };
    }

    // Do not try to be processed `var and `env` function inside background
    if (isVariableFunctionNode(node)) {
      shouldContinue = false;
      ranges[rangeIndex].start = null;
      ranges[rangeIndex].end = null;

      continue;
    }

    const isRepeatKeyword =
      node.type === 'word' && repeatKeywords.has(node.value.toLowerCase());

    if (ranges[rangeIndex].start === null && isRepeatKeyword) {
      ranges[rangeIndex].start = index;
      ranges[rangeIndex].end = index;

      continue;
    }

    if (ranges[rangeIndex].start !== null) {
      if (node.type !== 'space' && isRepeatKeyword) {
        ranges[rangeIndex].end = index;
      }
    }
  }

  for (const range of ranges) {
    if (range.start === null) {
      continue;
    }

    const nodes = parsed.nodes.slice(
      range.start,
      /** @type {number} */ (range.end) + 1
    );

    if (nodes.length !== 3) {
      continue;
    }
    const key = nodes
      .filter(evenValues)
      .map((n) => n.value.toLowerCase())
      .toString();

    const match = mappings.get(key);

    if (match) {
      nodes[0].value = match;
      nodes[1].value = nodes[2].value = '';
    }
  }

  return parsed.toString();
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-repeat-style',
    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(repeatPropertyRegex, (decl) => {
            const value = decl.value;

            if (!value) {
              return;
            }

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const result = transform(value);

            decl.value = result;
            cache.set(value, result);
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>}*/ (
  pluginCreator
);
