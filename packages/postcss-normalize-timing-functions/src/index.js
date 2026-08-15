'use strict';
const valueParser = require('postcss-value-parser');

/** @type {(node: valueParser.Node) => number} */
const getValue = (node) => Number.parseFloat(node.value);
const animationTransitionRegex =
  /^(-\w+-)?(animation|transition)(-timing-function)?$/i;

/* Works because toString() normalizes the formatting,
   so comparing the string forms behaves the same as number equality*/
const conversions = new Map([
  [[0.25, 0.1, 0.25, 1].toString(), 'ease'],
  [[0, 0, 1, 1].toString(), 'linear'],
  [[0.42, 0, 1, 1].toString(), 'ease-in'],
  [[0, 0, 0.58, 1].toString(), 'ease-out'],
  [[0.42, 0, 0.58, 1].toString(), 'ease-in-out'],
]);
/**
 * @param {valueParser.Node} node
 * @return {void | false}
 */
function reduce(node) {
  if (node.type !== 'function') {
    return false;
  }

  if (!node.value) {
    return;
  }

  const lowerCasedValue = node.value.toLowerCase();

  if (lowerCasedValue === 'steps') {
    return normalizeSteps(node);
  }

  if (lowerCasedValue === 'cubic-bezier') {
    return normalizeCubicBezier(node);
  }
}

/**
 * @param {valueParser.FunctionNode} node
 * @return {void | false}
 */
function normalizeSteps(node) {
  const count = node.nodes[0];
  const position = node.nodes[2];
  const isSingleStep = count.type === 'word' && getValue(count) === 1;

  if (isSingleStep && isStepPosition(position, 'start', 'jump-start')) {
    /** @type string */ (node.type) = 'word';
    node.value = 'step-start';

    delete (/** @type Partial<valueParser.FunctionNode> */ (node).nodes);

    return;
  }

  if (isSingleStep && isStepPosition(position, 'end', 'jump-end')) {
    /** @type string */ (node.type) = 'word';
    node.value = 'step-end';

    delete (/** @type Partial<valueParser.FunctionNode> */ (node).nodes);

    return;
  }

  // The end case is actually the browser default, so it isn't required.
  if (isStepPosition(position, 'end', 'jump-end')) {
    node.nodes = [count];

    return;
  }

  return false;
}

/**
 * @param {valueParser.Node | undefined} node
 * @param {string} first
 * @param {string} second
 * @return {boolean}
 */
function isStepPosition(node, first, second) {
  return (
    node?.type === 'word' &&
    (node.value.toLowerCase() === first || node.value.toLowerCase() === second)
  );
}

/**
 * @param {valueParser.FunctionNode} node
 * @return {void}
 */
function normalizeCubicBezier(node) {
  const values = node.nodes
    .filter((list, index) => {
      return index % 2 === 0;
    })
    .map(getValue);

  if (values.length !== 4) {
    return;
  }

  const match = conversions.get(values.toString());

  if (match) {
    /** @type string */ (node.type) = 'word';
    node.value = match;

    delete (/** @type Partial<valueParser.FunctionNode> */ (node).nodes);
  }
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  return valueParser(value).walk(reduce).toString();
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-timing-functions',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(animationTransitionRegex, (decl) => {
        const value = decl.value;

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
