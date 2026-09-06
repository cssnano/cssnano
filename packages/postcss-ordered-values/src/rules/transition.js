import {
  isFunction,
  isIdent,
  isPercentage,
  isString,
  isUrl,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
import isTime, { isMath, isNonNegativeTime } from '../lib/isTime.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = new Set(easingFunctions.keywords);
const timingFunctionNames = new Set(easingFunctions.functions);

/**
 * @param {import('../lib/tokenize.js').Term[]} arg
 * @return {import('../lib/tokenize.js').Term[] | null}
 */
function normalizeArg(arg) {
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

    const isTimingFunc =
      (isFunction(node) && timingFunctionNames.has(value)) ||
      (isIdent(node) && timingFunctions.has(value));

    if (isTimingFunc) {
      if (state.timingFunction.length) return null;
      state.timingFunction.push(node);
    } else if (!state.time1.length && isNonNegativeTime(node)) {
      state.time1.push(node);
    } else if (state.time1.length && !state.time2.length && isTime(node)) {
      state.time2.push(node);
    } else if (isTime(node)) {
      return null;
    } else {
      if (isString(node) || isPercentage(node) || isUrl(node)) return null;
      if (isIdent(node) && state.property.some(isIdent)) return null;
      state.property.push(node);
    }
  }

  return [
    ...state.property,
    ...state.time1,
    ...state.timingFunction,
    ...state.time2,
  ];
}

/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
 */
function normalize(args) {
  const list = [];
  for (const arg of args) {
    const normalized = normalizeArg(arg);
    if (!normalized) return null;
    list.push(normalized);
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
