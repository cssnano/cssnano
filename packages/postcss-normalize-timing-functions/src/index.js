import { plugin } from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'lerna:cssnano-util-get-match';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import getValue from './lib/getValue';
import isFunctionNode from './lib/isFunctionNode';
import isNodeValueOneOf from './lib/isNodeValueOneOf';
import isWordNode from './lib/isWordNode';
import takeEvenValues from './lib/takeEvenValues';

const getMatch = getMatchFactory([
  ['ease', [0.25, 0.1, 0.25, 1]],
  ['linear', [0, 0, 1, 1]],
  ['ease-in', [0.42, 0, 1, 1]],
  ['ease-out', [0, 0, 0.58, 1]],
  ['ease-in-out', [0.42, 0, 0.58, 1]],
]);

const getValueAsNumber = R.compose(
  parseFloat,
  getValue
);

const testWordAtPosition = R.curry((position, predicate, node) =>
  R.compose(
    R.ifElse(R.isNil, R.F, R.both(isWordNode, predicate)),
    R.path(['nodes', position])
  )(node)
);

const isFirstValueOne = testWordAtPosition(
  0,
  R.compose(
    R.equals(1),
    getValueAsNumber
  )
);

const hasKeywordInSecondPosition = (keywords) =>
  testWordAtPosition(2, isNodeValueOneOf(keywords));

const isStartOrJumpStart = hasKeywordInSecondPosition(['start', 'jump-start']);
const isEndOrJumpEnd = hasKeywordInSecondPosition(['end', 'jump-end']);

const getCubicBezierArguments = R.compose(
  takeEvenValues,
  R.map(getValueAsNumber)
);

const shouldReduce = R.both(R.has('value'), isFunctionNode);

function reduce(node) {
  if (!shouldReduce(node)) {
    return false;
  }

  const lowerCasedValue = node.value.toLowerCase();

  if (lowerCasedValue === 'steps') {
    const isFirstValue1 = isFirstValueOne(node);

    // Don't bother checking the step-end case as it has the same length
    // as steps(1)
    if (isFirstValue1 && isStartOrJumpStart(node)) {
      node.type = 'word';
      node.value = 'step-start';

      delete node.nodes;

      return;
    }

    if (isFirstValue1 && isEndOrJumpEnd(node)) {
      node.type = 'word';
      node.value = 'step-end';

      delete node.nodes;

      return;
    }

    // "end", or "jump-end" is the default, so it isn't required.
    if (isEndOrJumpEnd(node)) {
      node.nodes = [node.nodes[0]];

      return;
    }

    return false;
  }

  if (lowerCasedValue === 'cubic-bezier') {
    const values = R.into([], getCubicBezierArguments, node.nodes);

    if (values.length !== 4) {
      return;
    }

    const match = getMatch(values);

    if (match) {
      node.type = 'word';
      node.value = match;

      delete node.nodes;

      return;
    }
  }
}

const transform = cacheFn((value) =>
  valueParser(value)
    .walk(reduce)
    .toString()
);

export default plugin('postcss-normalize-timing-functions', () => {
  return (css) => {
    css.walkDecls(
      /^(-\w+-)?(animation|transition)(-timing-function)?$/i,
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
