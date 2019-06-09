import { plugin } from 'postcss';
import valueParser, { unit } from 'postcss-value-parser';
import * as R from 'ramda';
import cacheFn from './cacheFn';
import getValue from './getValue';
import isCommaNode from './isCommaNode';
import isMathFunctionNode from './isMathFunctionNode';
import isNodeValueOneOf from './isNodeValueOneOf';
import isVariableFunctionNode from './isVariableFunctionNode';
import isWordNode from './isWordNode';

const directionKeywords = ['top', 'right', 'bottom', 'left', 'center'];

const center = '50%';
const horizontal = { right: '100%', left: '0' };
const verticalValue = { bottom: '100%', top: '0' };

const isNumberNode = R.compose(
  R.complement(isNaN),
  parseFloat,
  getValue
);

function isDimensionNode(node) {
  const parsed = unit(node.value);

  if (!parsed) {
    return false;
  }

  return parsed.unit !== '';
}

const isPositionNode = R.either(
  R.both(
    isWordNode,
    R.anyPass([
      isNodeValueOneOf(directionKeywords),
      isDimensionNode,
      isNumberNode,
    ])
  ),
  isMathFunctionNode
);

const transform = cacheFn((value) => {
  const parsed = valueParser(value);
  const ranges = [];
  let rangeIndex = 0;
  let shouldContinue = true;

  parsed.nodes.forEach((node, index) => {
    // After comma (`,`) follows next background
    if (isCommaNode(node)) {
      rangeIndex += 1;
      shouldContinue = true;

      return;
    }

    if (!shouldContinue) {
      return;
    }

    // After separator (`/`) follows `background-size` values
    // Avoid them
    if (node.type === 'div' && node.value === '/') {
      shouldContinue = false;

      return;
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

      return;
    }

    const isPositionKeyword = isPositionNode(node);

    if (ranges[rangeIndex].start === null && isPositionKeyword) {
      ranges[rangeIndex].start = index;
      ranges[rangeIndex].end = index;

      return;
    }

    if (ranges[rangeIndex].start !== null) {
      if (node.type === 'space') {
        return;
      } else if (isPositionKeyword) {
        ranges[rangeIndex].end = index;

        return;
      }

      return;
    }
  });

  ranges.forEach((range) => {
    if (range.start === null) {
      return;
    }

    const nodes = parsed.nodes.slice(range.start, range.end + 1);

    if (nodes.length > 3) {
      return;
    }

    const firstNode = nodes[0].value.toLowerCase();
    const secondNode =
      nodes[2] && nodes[2].value ? nodes[2].value.toLowerCase() : null;

    const hasFirstNode = R.has(firstNode);
    const hasSecondNode = R.has(secondNode);

    if (nodes.length === 1 || secondNode === 'center') {
      if (secondNode) {
        nodes[2].value = nodes[1].value = '';
      }

      const map = Object.assign({}, horizontal, {
        center,
      });

      if (hasFirstNode(map)) {
        nodes[0].value = map[firstNode];
      }

      return;
    }

    if (firstNode === 'center' && R.includes(secondNode, directionKeywords)) {
      nodes[0].value = nodes[1].value = '';

      if (hasSecondNode(horizontal)) {
        nodes[2].value = horizontal[secondNode];
      }

      return;
    }

    if (hasFirstNode(horizontal) && hasSecondNode(verticalValue)) {
      nodes[0].value = horizontal[firstNode];
      nodes[2].value = verticalValue[secondNode];

      return;
    } else if (hasFirstNode(verticalValue) && hasSecondNode(horizontal)) {
      nodes[0].value = horizontal[secondNode];
      nodes[2].value = verticalValue[firstNode];

      return;
    }
  });

  return parsed.toString();
});

export default plugin('postcss-normalize-positions', () => {
  return (css) => {
    css.walkDecls(
      /^(background(-position)?|(-\w+-)?perspective-origin)$/i,
      (decl) => {
        const { value } = decl;

        if (!value) {
          return;
        }

        decl.value = transform(value);
      }
    );
  };
});
