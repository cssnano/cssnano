import * as R from 'ramda';
import eqProps from './eqProps';
import equalSelectors from './equalSelectors';
import isAtRuleNode from './isAtRuleNode';
import isDeclNode from './isDeclNode';
import isRuleNode from './isRuleNode';

function trimValue(value) {
  return value ? value.trim() : value;
}

const hasNodes = R.has('nodes');

const firstArg = R.nthArg(0);

const psi = R.curry((f, g, x, y) => f(g(x))(g(y)));

const rawPathIsEqual = (path) =>
  psi(
    R.equals,
    R.compose(
      trimValue,
      R.path(path)
    )
  );

const equalRawAfterName = rawPathIsEqual(['raws', 'afterName']);

const equalRawBefore = rawPathIsEqual(['raws', 'before']);

const handleRule = [
  R.compose(
    isRuleNode,
    firstArg
  ),
  equalSelectors,
];

const handleAtRule = [
  R.compose(
    isAtRuleNode,
    firstArg
  ),
  R.allPass([
    eqProps('name'),
    eqProps('params'),
    equalRawBefore,
    equalRawAfterName,
  ]),
];

const handleDecl = [
  R.compose(
    isDeclNode,
    firstArg
  ),
  R.allPass([
    eqProps('prop'),
    eqProps('value'),
    eqProps('important'),
    equalRawBefore,
  ]),
];

const equalType = eqProps('type');

const equalNodes = R.unapply(
  R.either(R.all(hasNodes), R.all(R.complement(hasNodes)))
);

const equalByType = R.cond([handleAtRule, handleRule, handleDecl]);

const equalByChildren = R.ifElse(
  R.compose(
    hasNodes,
    firstArg
  ),
  R.compose(
    ([a, b]) => a.every((x, i) => equals(x, b[i])),
    R.unapply(R.pluck('nodes'))
  ),
  R.T
);

const equals = R.allPass([equalType, equalNodes, equalByType, equalByChildren]);

export default equals;
