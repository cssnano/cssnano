import { unit } from '../lib/parse.js';
import cssnanoUtils from 'cssnano-utils';
import addSpace from '../lib/addSpace.js';
import getValue from '../lib/getValue.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

const { getArguments } = cssnanoUtils;
// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = new Set(easingFunctions.keywords);
const timingFunctionNames = new Set(easingFunctions.functions);

/**
 * @param {import('postcss-value-parser').Node[][]} args
 * @return {import('postcss-value-parser').Node[][]}
 */
function normalize(args) {
  const list = [];
  for (const arg of args) {
    /** @type {Record<string, import('postcss-value-parser').Node[]>} */
    const state = {
      timingFunction: [],
      property: [],
      time1: [],
      time2: [],
    };

    for (const node of arg) {
      const { type, value } = node;

      if (type === 'space') {
        continue;
      }

      if (type === 'function' && timingFunctionNames.has(value.toLowerCase())) {
        state.timingFunction = [...state.timingFunction, node, addSpace()];
      } else if (unit(value)) {
        if (!state.time1.length) {
          state.time1 = [...state.time1, node, addSpace()];
        } else {
          state.time2 = [...state.time2, node, addSpace()];
        }
      } else if (timingFunctions.has(value.toLowerCase())) {
        state.timingFunction = [...state.timingFunction, node, addSpace()];
      } else {
        state.property = [...state.property, node, addSpace()];
      }
    }

    list.push([
      ...state.property,
      ...state.time1,
      ...state.timingFunction,
      ...state.time2,
    ]);
  }
  return list;
}
/**
 * @param {import('postcss-value-parser').ParsedValue} parsed
 * @return {string}
 */
function normalizeTransition(parsed) {
  const values = normalize(getArguments(parsed));
  return getValue(values);
}

export default normalizeTransition;
