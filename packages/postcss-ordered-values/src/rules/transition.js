import {
  isDimension,
  isFunction,
  isNumber,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = new Set(easingFunctions.keywords);
const timingFunctionNames = new Set(easingFunctions.functions);

/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][]}
 */
function normalize(args) {
  const list = [];
  for (const arg of args) {
    /** @type {Record<string, import('../lib/tokenize.js').Term[]>} */
    const state = {
      timingFunction: [],
      property: [],
      time1: [],
      time2: [],
    };

    for (const node of arg) {
      const value = name(node);

      if (isFunction(node) && timingFunctionNames.has(value)) {
        state.timingFunction.push(node);
      } else if (isDimension(node) || isNumber(node)) {
        if (!state.time1.length) {
          state.time1.push(node);
        } else {
          state.time2.push(node);
        }
      } else if (timingFunctions.has(value)) {
        state.timingFunction.push(node);
      } else {
        state.property.push(node);
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
 * @param {{ arguments: import('../lib/tokenize.js').Term[][] }} parsed
 * @return {string}
 */
function normalizeTransition(parsed) {
  return serializeArguments(normalize(parsed.arguments));
}

export default normalizeTransition;
