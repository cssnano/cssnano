import { unit } from 'postcss-value-parser';
import { getArguments } from 'lerna:cssnano-utils';
import addSpace from '../lib/addSpace';
import getValue from '../lib/getValue';

// animation: [ none | <keyframes-name> ] || <time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state>

const isTimingFunction = (value, type) => {
  const functions = ['steps', 'cubic-bezier', 'frames'];
  const keywords = [
    'ease',
    'ease-in',
    'ease-in-out',
    'ease-out',
    'linear',
    'step-end',
    'step-start',
  ];

  return (
    (type === 'function' && functions.includes(value)) ||
    keywords.includes(value)
  );
};

const isDirection = (value) => {
  return ['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(
    value
  );
};

const isFillMode = (value) => {
  return ['none', 'forwards', 'backwards', 'both'].includes(value);
};

const isPlayState = (value) => {
  return ['running', 'paused'].includes(value);
};

const isTime = (value) => {
  const quantity = unit(value);

  return quantity && ['ms', 's'].includes(quantity.unit);
};

const isIterationCount = (value) => {
  const quantity = unit(value);

  return value === 'infinite' || (quantity && !quantity.unit);
};

export default function normalizeAnimation(parsed) {
  const args = getArguments(parsed);

  const values = args.reduce((list, arg) => {
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
      let { type, value } = node;

      if (type === 'space') {
        return;
      }

      value = value.toLowerCase();

      const hasMatch = stateConditions.some(({ property, delegate }) => {
        if (delegate(value, type) && !state[property].length) {
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
  }, []);

  return getValue(values);
}
