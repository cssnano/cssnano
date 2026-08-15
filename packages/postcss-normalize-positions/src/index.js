'use strict';
const valueParser = require('postcss-value-parser');

const directionKeywords = new Set(['top', 'right', 'bottom', 'left', 'center']);

const center = '50%';
const horizontal = new Map([
  ['right', '100%'],
  ['left', '0'],
]);
const verticalValue = new Map([
  ['bottom', '100%'],
  ['top', '0'],
]);
const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);
const variableFunctions = new Set(['var', 'env', 'constant']);
const propFilterRegex =
  /^(background(-position)?|(-\w+-)?perspective-origin)$/i;

/**
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isCommaNode(node) {
  return node.type === 'div' && node.value === ',';
}

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
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isMathFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }
  return mathFunctions.has(node.value.toLowerCase());
}

/**
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isNumberNode(node) {
  if (node.type !== 'word') {
    return false;
  }

  const value = Number.parseFloat(node.value);

  return !Number.isNaN(value);
}

/**
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isDimensionNode(node) {
  if (node.type !== 'word') {
    return false;
  }

  const parsed = valueParser.unit(node.value);

  if (!parsed) {
    return false;
  }

  return parsed.unit !== '';
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const parsed = valueParser(value);
  const ranges = collectRanges(parsed.nodes);

  for (const range of ranges) {
    normalizeRange(parsed, range);
  }

  return parsed.toString();
}

/**
 * @param {valueParser.Node[]} nodes
 * @return {{start: number | null, end: number | null}[]}
 */
function collectRanges(nodes) {
  /** @type {{start: number | null, end: number | null}[]} */
  const ranges = [];
  let rangeIndex = 0;
  let shouldContinue = true;

  for (const [index, node] of nodes.entries()) {
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

    const isPositionKeyword =
      (node.type === 'word' &&
        directionKeywords.has(node.value.toLowerCase())) ||
      isDimensionNode(node) ||
      isNumberNode(node) ||
      isMathFunctionNode(node);

    if (ranges[rangeIndex].start === null && isPositionKeyword) {
      ranges[rangeIndex].start = index;
      ranges[rangeIndex].end = index;

      continue;
    }

    if (ranges[rangeIndex].start !== null) {
      if (node.type !== 'space' && isPositionKeyword) {
        ranges[rangeIndex].end = index;
      }
    }
  }

  return ranges;
}

/**
 * @param {{nodes: valueParser.Node[]}} parsed
 * @param {{start: number | null, end: number | null}} range
 * @return {void}
 */
function normalizeRange(parsed, range) {
  if (range.start === null || range.end === null) {
    return;
  }

  const nodes = parsed.nodes.slice(range.start, range.end + 1);

  if (nodes.length > 3) {
    return;
  }

  const firstNode = nodes[0].value.toLowerCase();
  const secondNode =
    nodes[2] && nodes[2].value ? nodes[2].value.toLowerCase() : null;

  if (nodes.length === 1 || secondNode === 'center') {
    normalizeSinglePosition(nodes, firstNode, secondNode);
    return;
  }

  normalizePairPosition(nodes, firstNode, secondNode);
}

/**
 * @param {valueParser.Node[]} nodes
 * @param {string} firstNode
 * @param {string | null} secondNode
 * @return {void}
 */
function normalizeSinglePosition(nodes, firstNode, secondNode) {
  if (secondNode) {
    nodes[2].value = nodes[1].value = '';
  }

  const map = new Map([...horizontal, ['center', center]]);

  if (map.has(firstNode)) {
    nodes[0].value = /** @type {string}*/ (map.get(firstNode));
  }
}

/**
 * @param {valueParser.Node[]} nodes
 * @param {string} firstNode
 * @param {string | null} secondNode
 * @return {void}
 */
function normalizePairPosition(nodes, firstNode, secondNode) {
  if (secondNode === null) {
    return;
  }

  if (firstNode === 'center' && directionKeywords.has(secondNode)) {
    nodes[0].value = nodes[1].value = '';

    if (horizontal.has(secondNode)) {
      nodes[2].value = /** @type {string} */ (horizontal.get(secondNode));
    }
    return;
  }

  if (horizontal.has(firstNode) && verticalValue.has(secondNode)) {
    nodes[0].value = /** @type {string} */ (horizontal.get(firstNode));
    nodes[2].value = /** @type {string} */ (verticalValue.get(secondNode));
  } else if (verticalValue.has(firstNode) && horizontal.has(secondNode)) {
    nodes[0].value = /** @type {string} */ (horizontal.get(secondNode));
    nodes[2].value = /** @type {string} */ (verticalValue.get(firstNode));
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-positions',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(propFilterRegex, (decl) => {
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
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>}*/ (
  pluginCreator
);
