import { plugin } from 'postcss';
import valueParser, { unit } from 'postcss-value-parser';
import has from 'has';

const directions = ['top', 'right', 'bottom', 'left', 'center'];

const center = '50%';

const horizontal = {
  right: '100%',
  left: '0',
};

const vertical = {
  bottom: '100%',
  top: '0',
};

function isCommaNode(node) {
  return node.type === 'div' && node.value === ',';
}

function isVariableFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['var', 'env'].includes(node.value.toLowerCase());
}

function isMathFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['calc', 'min', 'max', 'clamp'].includes(node.value.toLowerCase());
}

function isNumberNode(node) {
  if (node.type !== 'word') {
    return false;
  }

  const value = parseFloat(node.value);

  return !isNaN(value);
}

function isDimensionNode(node) {
  if (node.type !== 'word') {
    return false;
  }

  const parsed = unit(node.value);

  if (!parsed) {
    return false;
  }

  return parsed.unit !== '';
}

function transform(value) {
  const parsed = valueParser(value);
  const ranges = [];
  let backgroundIndex = 0;
  let shouldContinue = true;

  parsed.nodes.forEach((node, index) => {
    // After comma (`,`) follows next background
    if (isCommaNode(node)) {
      backgroundIndex += 1;
      shouldContinue = true;

      return;
    }

    if (!shouldContinue) {
      return;
    }

    // After separator (`/`) follows `background-size` values
    // Avoid their
    if (node.type === 'div' && node.value === '/') {
      shouldContinue = false;

      return;
    }

    if (!ranges[backgroundIndex]) {
      ranges[backgroundIndex] = {
        start: null,
        end: null,
      };
    }

    // Do not try to be processed `var and `env` function inside background
    if (isVariableFunctionNode(node)) {
      shouldContinue = false;
      ranges[backgroundIndex].start = null;
      ranges[backgroundIndex].end = null;

      return;
    }

    const isPosition =
      (node.type === 'word' && directions.includes(node.value.toLowerCase())) ||
      isDimensionNode(node) ||
      isNumberNode(node) ||
      isMathFunctionNode(node);

    if (ranges[backgroundIndex].start === null && isPosition) {
      ranges[backgroundIndex].start = index;
      ranges[backgroundIndex].end = index;

      return;
    }

    if (ranges[backgroundIndex].start !== null) {
      if (node.type === 'space') {
        return;
      } else if (isPosition) {
        ranges[backgroundIndex].end = index;

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

    if (nodes.length === 1 || secondNode === 'center') {
      if (secondNode) {
        nodes[2].value = nodes[1].value = '';
      }

      const map = Object.assign({}, horizontal, {
        center,
      });

      if (has(map, firstNode)) {
        nodes[0].value = map[firstNode];
      }

      return;
    }

    if (firstNode === 'center' && directions.includes(secondNode)) {
      nodes[0].value = nodes[1].value = '';

      if (has(horizontal, secondNode)) {
        nodes[2].value = horizontal[secondNode];
      }

      return;
    }

    if (has(horizontal, firstNode) && has(vertical, secondNode)) {
      nodes[0].value = horizontal[firstNode];
      nodes[2].value = vertical[secondNode];

      return;
    } else if (has(vertical, firstNode) && has(horizontal, secondNode)) {
      nodes[0].value = horizontal[secondNode];
      nodes[2].value = vertical[firstNode];

      return;
    }
  });

  return parsed.toString();
}

export default plugin('postcss-normalize-positions', () => {
  return (css) => {
    const cache = {};

    css.walkDecls(
      /^(background(-position)?|(-\w+-)?perspective-origin)$/i,
      (decl) => {
        const value = decl.value;

        if (!value) {
          return;
        }

        if (cache[value]) {
          decl.value = cache[value];

          return;
        }

        const result = transform(value);

        decl.value = result;
        cache[value] = result;
      }
    );
  };
});
