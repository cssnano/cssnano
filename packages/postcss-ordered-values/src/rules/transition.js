import { unit } from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import * as R from 'ramda';
import addSpace from '../lib/addSpace';
import getValue from '../lib/getValue';
import isFunctionNode from '../lib/isFunctionNode';
import isNodeValueOneOf from '../lib/isNodeValueOneOf';
import isSpaceNode from '../lib/isSpaceNode';

// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = [
  'ease',
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
];

const isTimingKeyword = isNodeValueOneOf(timingFunctions);

const isTimingFunctionNode = R.both(
  isFunctionNode,
  isNodeValueOneOf(['cubic-bezier', 'steps'])
);

const normalizeTransition = R.compose(
  getValue,
  R.reduce((list, arg) => {
    let state = {
      timingFunction: [],
      property: [],
      time1: [],
      time2: [],
    };

    arg.forEach((node) => {
      const { value } = node;

      if (isSpaceNode(node)) {
        return;
      }

      if (isTimingFunctionNode(node)) {
        state.timingFunction = [...state.timingFunction, node, addSpace()];
      } else if (unit(value)) {
        if (!state.time1.length) {
          state.time1 = [node, addSpace()];
        } else {
          state.time2 = [...state.time2, node, addSpace()];
        }
      } else if (isTimingKeyword(node)) {
        state.timingFunction = [...state.timingFunction, node, addSpace()];
      } else {
        state.property = [...state.property, node, addSpace()];
      }
    });

    return [
      ...list,
      [
        ...state.property,
        ...state.time1,
        ...state.timingFunction,
        ...state.time2,
      ],
    ];
  }, []),
  getArguments
);

export default normalizeTransition;
