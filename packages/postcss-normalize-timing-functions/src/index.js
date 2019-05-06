import { plugin } from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'lerna:cssnano-util-get-match';

const getValue = (node) => parseFloat(node.value);

function reduce(node) {
  if (node.type !== 'function') {
    return false;
  }

  if (!node.value) {
    return;
  }

  const lowerCasedValue = node.value.toLowerCase();

  if (lowerCasedValue === 'steps') {
    // Don't bother checking the step-end case as it has the same length
    // as steps(1)
    if (
      node.nodes[0].type === 'word' &&
      getValue(node.nodes[0]) === 1 &&
      node.nodes[2] &&
      node.nodes[2].type === 'word' &&
      (node.nodes[2].value.toLowerCase() === 'start' ||
        node.nodes[2].value.toLowerCase() === 'jump-start')
    ) {
      node.type = 'word';
      node.value = 'step-start';

      delete node.nodes;

      return;
    }

    if (
      node.nodes[0].type === 'word' &&
      getValue(node.nodes[0]) === 1 &&
      node.nodes[2] &&
      node.nodes[2].type === 'word' &&
      (node.nodes[2].value.toLowerCase() === 'end' ||
        node.nodes[2].value.toLowerCase() === 'jump-end')
    ) {
      node.type = 'word';
      node.value = 'step-end';

      delete node.nodes;

      return;
    }

    // The end case is actually the browser default, so it isn't required.
    if (
      node.nodes[2] &&
      node.nodes[2].type === 'word' &&
      (node.nodes[2].value.toLowerCase() === 'end' ||
        node.nodes[2].value.toLowerCase() === 'jump-end')
    ) {
      node.nodes = [node.nodes[0]];

      return;
    }

    return false;
  }

  if (lowerCasedValue === 'cubic-bezier') {
    const values = node.nodes
      .filter((list, index) => {
        return index % 2 === 0;
      })
      .map(getValue);

    if (values.length !== 4) {
      return;
    }

    const match = getMatchFactory([
      ['ease', [0.25, 0.1, 0.25, 1]],
      ['linear', [0, 0, 1, 1]],
      ['ease-in', [0.42, 0, 1, 1]],
      ['ease-out', [0, 0, 0.58, 1]],
      ['ease-in-out', [0.42, 0, 0.58, 1]],
    ])(values);

    if (match) {
      node.type = 'word';
      node.value = match;

      delete node.nodes;

      return;
    }
  }
}

function transform(value) {
  return valueParser(value)
    .walk(reduce)
    .toString();
}

export default plugin('postcss-normalize-timing-functions', () => {
  return (css) => {
    const cache = {};

    css.walkDecls(
      /^(-\w+-)?(animation|transition)(-timing-function)?$/i,
      (decl) => {
        const value = decl.value;

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
