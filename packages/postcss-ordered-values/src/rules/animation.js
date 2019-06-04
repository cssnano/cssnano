import { unit } from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import * as R from 'ramda';
import addSpace from '../lib/addSpace';
import getValue from '../lib/getValue';
import includedIn from '../lib/includedIn';
import isNodeValue from '../lib/isNodeValue';
import isNodeValueOneOf from '../lib/isNodeValueOneOf';
import isFunctionNode from '../lib/isFunctionNode';
import isSpaceNode from '../lib/isSpaceNode';

const getUnit = R.prop('unit');

// animation: [ none | <keyframes-name> ] || <time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state>

const isTimingFunction = R.either(
  R.both(isFunctionNode, isNodeValueOneOf(['steps', 'cubic-bezier', 'frames'])),
  isNodeValueOneOf([
    'ease',
    'ease-in',
    'ease-in-out',
    'ease-out',
    'linear',
    'step-end',
    'step-start',
  ])
);

const isDirection = isNodeValueOneOf([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
]);

const isFillMode = isNodeValueOneOf(['none', 'forwards', 'backwards', 'both']);

const isPlayState = isNodeValueOneOf(['running', 'paused']);

const isTime = isNodeValue(
  R.compose(
    includedIn(['ms', 's']),
    getUnit,
    unit
  )
);

const isIterationCount = isNodeValue(
  R.compose(
    R.either(
      R.equals('infinite'),
      R.compose(
        R.propSatisfies(R.isEmpty, 'unit'),
        unit
      )
    )
  )
);

const normalizeAnimation = R.compose(
  getValue,
  R.reduce((list, arg) => {
    const state = {
      name: [],
      duration: [],
      timingFunction: [],
      delay: [],
      iterationCount: [],
      direction: [],
      fillMode: [],
      playState: [],
    };
    const stateConditions = [
      { property: 'duration', delegate: isTime },
      { property: 'timingFunction', delegate: isTimingFunction },
      { property: 'delay', delegate: isTime },
      { property: 'iterationCount', delegate: isIterationCount },
      { property: 'direction', delegate: isDirection },
      { property: 'fillMode', delegate: isFillMode },
      { property: 'playState', delegate: isPlayState },
    ];

    arg.forEach((node) => {
      if (isSpaceNode(node)) {
        return;
      }

      const hasMatch = stateConditions.some(({ property, delegate }) => {
        if (delegate(node) && !state[property].length) {
          state[property] = [node, addSpace()];
          return true;
        }
      });

      if (!hasMatch) {
        state.name = [...state.name, node, addSpace()];
      }
    });
    return [
      ...list,
      [
        ...state.name,
        ...state.duration,
        ...state.timingFunction,
        ...state.delay,
        ...state.iterationCount,
        ...state.direction,
        ...state.fillMode,
        ...state.playState,
      ],
    ];
  }, []),
  getArguments
);

export default normalizeAnimation;
