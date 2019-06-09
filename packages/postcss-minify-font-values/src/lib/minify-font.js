import { unit } from 'postcss-value-parser';
import * as R from 'ramda';
import isFunctionNode from './isFunctionNode';
import isNodeValueOneOf from './isNodeValueOneOf';
import isSpaceNode from './isSpaceNode';
import keywords from './keywords';
import minifyFamily from './minify-family';
import minifyWeight from './minify-weight';

const isOtherKeyword = isNodeValueOneOf([
  'normal',
  'inherit',
  'initial',
  'unset',
]);

const isSizeKeyword = isNodeValueOneOf(keywords.size);

const isStretchKeyword = isNodeValueOneOf(keywords.stretch);

const isStyleKeyword = isNodeValueOneOf(keywords.style);

const isVariantKeyword = isNodeValueOneOf(keywords.variant);

const isWeightKeyword = isNodeValueOneOf(keywords.weight);

export default function(nodes, opts) {
  let i, max, node, familyStart, family;
  let hasSize = false;

  for (i = 0, max = nodes.length; i < max; i += 1) {
    node = nodes[i];

    if (node.type === 'word') {
      if (hasSize) {
        continue;
      }

      if (
        R.anyPass([
          isOtherKeyword,
          isVariantKeyword,
          isStretchKeyword,
          isStyleKeyword,
        ])(node) ||
        unit(node.value)
      ) {
        familyStart = i;
      } else if (isWeightKeyword(node)) {
        node.value = minifyWeight(node.value);
        familyStart = i;
      } else if (isSizeKeyword(node)) {
        familyStart = i;
        hasSize = true;
      }
    } else if (
      isFunctionNode(node) &&
      nodes[i + 1] &&
      isSpaceNode(nodes[i + 1])
    ) {
      familyStart = i;
    } else if (node.type === 'div' && node.value === '/') {
      familyStart = i + 1;
      break;
    }
  }

  familyStart += 2;

  family = minifyFamily(nodes.slice(familyStart), opts);

  return nodes.slice(0, familyStart).concat(family);
}
