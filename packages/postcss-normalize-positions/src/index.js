import valueParser, { unit } from 'postcss-value-parser';

const directionKeywords = ['top', 'right', 'bottom', 'left', 'center'];

const center = '50%';
const horizontal = { right: '100%', left: '0' };
const verticalValue = { bottom: '100%', top: '0' };

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

    const isPositionKeyword =
      (node.type === 'word' &&
        directionKeywords.includes(node.value.toLowerCase())) ||
      isDimensionNode(node) ||
      isNumberNode(node) ||
      isMathFunctionNode(node);

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

    if (nodes.length === 1 || secondNode === 'center') {
      if (secondNode) {
        nodes[2].value = nodes[1].value = '';
      }

      const map = Object.assign({}, horizontal, {
        center,
      });

      if (Object.prototype.hasOwnProperty.call(map, firstNode)) {
        nodes[0].value = map[firstNode];
      }

      return;
    }

    if (firstNode === 'center' && directionKeywords.includes(secondNode)) {
      nodes[0].value = nodes[1].value = '';

      if (Object.prototype.hasOwnProperty.call(horizontal, secondNode)) {
        nodes[2].value = horizontal[secondNode];
      }

      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(horizontal, firstNode) &&
      Object.prototype.hasOwnProperty.call(verticalValue, secondNode)
    ) {
      nodes[0].value = horizontal[firstNode];
      nodes[2].value = verticalValue[secondNode];

      return;
    } else if (
      Object.prototype.hasOwnProperty.call(verticalValue, firstNode) &&
      Object.prototype.hasOwnProperty.call(horizontal, secondNode)
    ) {
      nodes[0].value = horizontal[secondNode];
      nodes[2].value = verticalValue[firstNode];

      return;
    }
  });

  return parsed.toString();
}

const pluginCreator = () => {
  return {
    postcssPlugin: 'postcss-normalize-positions',
    prepare() {
      const cache = {};
      const positionMatch = /^(background(-position)?|(-\w+-)?perspective-origin)$/i;
      return {
        Declaration(decl) {
          if (positionMatch.test(decl.prop)) {
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
        },
      };
    },
  };
};

pluginCreator.postcss = true;
export default pluginCreator;
