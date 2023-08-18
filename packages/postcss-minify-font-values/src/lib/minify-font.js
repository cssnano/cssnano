'use strict';
const { unit } = require('postcss-value-parser');
const keywords = require('./keywords');
const minifyFamily = require('./minify-family');
const minifyWeight = require('./minify-weight');

/**
 * @param {import('postcss-value-parser').Node[]} nodes
 * @param {import('../index').Options} opts
 * @return {import('postcss-value-parser').Node[]}
 */
module.exports = function (nodes, opts) {
  let i, max, node, family;
  let familyStart = NaN;
  let hasSize = false;

  for (i = 0, max = nodes.length; i < max; i += 1) {
    node = nodes[i];

    if (node.type === 'word') {
      if (hasSize) {
        continue;
      }

      const value = node.value.toLowerCase();

      if (
        value === 'normal' ||
        value === 'inherit' ||
        value === 'initial' ||
        value === 'unset'
      ) {
        familyStart = i;
      } else if (keywords.style.has(value) || unit(value)) {
        familyStart = i;
      } else if (keywords.variant.has(value)) {
        familyStart = i;
      } else if (keywords.weight.has(value)) {
        node.value = minifyWeight(value);
        familyStart = i;
      } else if (keywords.stretch.has(value)) {
        familyStart = i;
      } else if (keywords.size.has(value) || unit(value)) {
        familyStart = i;
        hasSize = true;
      }
    } else if (
      node.type === 'function' &&
      nodes[i + 1] &&
      nodes[i + 1].type === 'space'
    ) {
      familyStart = i;
    } else if (node.type === 'div' && node.value === '/') {
      familyStart = i + 1;
      break;
    }
  }

  let needAdditionalSpace = false;

  // handle case .8em"Times New Roman"
  if (nodes[familyStart + 1].type === 'space') {
    familyStart += 2;
  } else {
    // @ts-ignore
    if (nodes[familyStart + 1].quote) {
      needAdditionalSpace = true
    }
    familyStart += 1;
  }

  const familyNodes = nodes.slice(familyStart);

  family = minifyFamily(familyNodes, opts);

  if (needAdditionalSpace) {
    return nodes.slice(0, familyStart).concat([
      /** @type {import('postcss-value-parser').SpaceNode} */ ({
        type: 'space',
        value: ' ',
      }),
    ], family);
  }

  return nodes.slice(0, familyStart).concat(family);
};
