import { unit } from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import addSpace from '../lib/addSpace';
import getValue from '../lib/getValue';

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

export default function normalizeTransition(parsed) {
  let args = getArguments(parsed);

  let values = args.reduce((list, arg) => {
    let state = {
      timingFunction: [],
      property: [],
      time1: [],
      time2: [],
    };

    arg.forEach((node) => {
      const { type, value } = node;

      if (type === 'space') {
        return;
      }

      if (
        type === 'function' &&
        ~['steps', 'cubic-bezier'].indexOf(value.toLowerCase())
      ) {
        state.timingFunction = [...state.timingFunction, node, addSpace()];
      } else if (unit(value)) {
        if (!state.time1.length) {
          state.time1 = [...state.time1, node, addSpace()];
        } else {
          state.time2 = [...state.time2, node, addSpace()];
        }
      } else if (~timingFunctions.indexOf(value.toLowerCase())) {
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
  }, []);

  return getValue(values);
}
