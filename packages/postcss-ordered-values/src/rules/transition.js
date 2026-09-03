import {
  isFunction,
  isIdent,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
import isTime, { isMath } from '../lib/isTime.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = new Set(easingFunctions.keywords);
const timingFunctionNames = new Set(easingFunctions.functions);

/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
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
      if (isMath(node) && !isTime(node)) return null;

      if (isFunction(node) && timingFunctionNames.has(value)) {
        if (state.timingFunction.length) return null;
        state.timingFunction.push(node);
      } else if (isTime(node)) {
        if (!state.time1.length) {
          state.time1.push(node);
        } else if (!state.time2.length) {
          state.time2.push(node);
        } else {
          return null;
        }
      } else if (isIdent(node) && timingFunctions.has(value)) {
        if (state.timingFunction.length) return null;
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
 * @return {string | null}
 */
function normalizeTransition(parsed) {
  const normalized = normalize(parsed.arguments);
  return normalized === null ? null : serializeArguments(normalized);
}

export default normalizeTransition;
