'use strict';
const valueParser = require('postcss-value-parser');
const keywords = require('./keywords');
const minifyFamily = require('./minify-family');
const minifyWeight = require('./minify-weight');

/**
 * Adds missing spaces before strings.
 *
 * @param toBeSpliced {Set<number>}
 * @param {import('postcss-value-parser').Node[]} nodes
 * @return {void}
 */
function normalizeNodes(nodes, toBeSpliced) {
  for (const index of toBeSpliced) {
    nodes.splice(
      index,
      0,
      /** @type {import('postcss-value-parser').SpaceNode} */ ({
        type: 'space',
        value: ' ',
      })
    );
  }
}

/**
 * @param {import('postcss-value-parser').Node} node
 * @param {number} index
 * @param {{familyStart: number, hasSize: boolean}} state
 * @return {void}
 */
function processWord(node, index, state) {
  if (state.hasSize) {
    return;
  }

  const value = node.value.toLowerCase();
  if (isUnmodifiedBoundary(value) || keywords.style.has(value)) {
    state.familyStart = index;
  } else if (keywords.variant.has(value)) {
    state.familyStart = index;
  } else if (keywords.weight.has(value)) {
    node.value = minifyWeight(value);
    state.familyStart = index;
  } else if (keywords.stretch.has(value)) {
    state.familyStart = index;
  } else if (keywords.size.has(value) || valueParser.unit(value)) {
    state.familyStart = index;
    state.hasSize = true;
  }
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isUnmodifiedBoundary(value) {
  return (
    value === 'normal' ||
    value === 'inherit' ||
    value === 'initial' ||
    value === 'unset' ||
    Boolean(valueParser.unit(value))
  );
}

/**
 * @param {import('postcss-value-parser').Node} node
 * @param {number} index
 * @param {import('postcss-value-parser').Node | undefined} nextNode
 * @param {{familyStart: number}} state
 * @return {boolean}
 */
function processNonWord(node, index, nextNode, state) {
  if (node.type === 'function' && nextNode?.type === 'space') {
    state.familyStart = index;
  }

  if (node.type === 'div' && node.value === '/') {
    state.familyStart = index + 1;
    return true;
  }

  return false;
}

/**
 * @param {string} unminified
 * @param {import('../index').Options} opts
 * @return {string}
 */
module.exports = function (unminified, opts) {
  const tree = valueParser(unminified);
  const nodes = tree.nodes;

  const state = { familyStart: Number.NaN, hasSize: false };
  const toBeSpliced = new Set();

  for (const [i, node] of nodes.entries()) {
    if (node.type === 'string' && i > 0 && nodes[i - 1].type !== 'space') {
      toBeSpliced.add(i);
    }

    if (node.type === 'word') {
      processWord(node, i, state);
    } else if (processNonWord(node, i, nodes[i + 1], state)) {
      break;
    }
  }

  normalizeNodes(nodes, toBeSpliced);
  const familyStart = state.familyStart + 2;

  const family = minifyFamily(nodes.slice(familyStart), opts);

  tree.nodes = nodes.slice(0, familyStart).concat(family);
  return tree.toString();
};
