'use strict';
const valueParser = require('postcss-value-parser');
const mappings = require('./lib/map');

function evenValues(list, index) {
  return index % 2 === 0;
}

const repeatKeywords = new Set(mappings.values());

function isCommaNode(node) {
  return node.type === 'div' && node.value === ',';
}

function isVariableFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['var', 'env'].includes(node.value.toLowerCase());
}

function transform(value) {
  const parsed = valueParser(value);

  if (parsed.nodes.length === 1) {
    return value;
  }

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

    const isRepeatKeyword =
      node.type === 'word' && repeatKeywords.has(node.value.toLowerCase());

    if (ranges[rangeIndex].start === null && isRepeatKeyword) {
      ranges[rangeIndex].start = index;
      ranges[rangeIndex].end = index;

      return;
    }

    if (ranges[rangeIndex].start !== null) {
      if (node.type === 'space') {
        return;
      } else if (isRepeatKeyword) {
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

    if (nodes.length !== 3) {
      return;
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
  });

  return parsed.toString();
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-repeat-style',
    prepare() {
      const cache = new Map();
      return {
        OnceExit(css) {
          css.walkDecls(
            /^(background(-repeat)?|(-\w+-)?mask-repeat)$/i,
            (decl) => {
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
            }
          );
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
