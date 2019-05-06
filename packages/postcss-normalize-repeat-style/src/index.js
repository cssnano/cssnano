import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'lerna:cssnano-util-get-match';
import mappings from './lib/map';

function evenValues(list, index) {
  return index % 2 === 0;
}

const repeatKeywords = mappings.map((mapping) => mapping[0]);

const getMatch = getMatchFactory(mappings);

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
      node.type === 'word' && repeatKeywords.includes(node.value.toLowerCase());

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

    const match = getMatch(
      nodes.filter(evenValues).map((n) => n.value.toLowerCase())
    );

    if (match) {
      nodes[0].value = match;
      nodes[1].value = nodes[2].value = '';
    }
  });

  return parsed.toString();
}

export default postcss.plugin('postcss-normalize-repeat-style', () => {
  return (css) => {
    const cache = {};

    css.walkDecls(/^(background(-repeat)?|(-\w+-)?mask-repeat)$/i, (decl) => {
      const value = decl.value;

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const parsed = valueParser(value);

      if (parsed.nodes.length === 1) {
        cache[value] = value;

        return;
      }

      const result = transform(value);

      decl.value = result;
      cache[value] = result;
    });
  };
});
