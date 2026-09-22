import {
  isDimension,
  isFunction,
  isIdent,
  isNumber,
  isUrl,
  name,
  reservedIdentKeywords,
  serializeArguments,
} from '../lib/tokenize.js';
import classifyTime from '../lib/isTime.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = new Set(easingFunctions.keywords);
const timingFunctionNames = new Set(easingFunctions.functions);

/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
function isTimingFunction(value, node) {
  return (
    (isFunction(node) && timingFunctionNames.has(value)) ||
    (isIdent(node) && timingFunctions.has(value))
  );
}

/**
 * @param {import('../lib/tokenize.js').Term} node
 * @param {string} value
 * @param {boolean} hasIdentProperty
 * @return {boolean}
 */
function isInvalidTransitionProperty(node, value, hasIdentProperty) {
  if (
    !isIdent(node) &&
    !isFunction(node) &&
    !isDimension(node) &&
    !isNumber(node)
  ) {
    return true;
  }
  if (isUrl(node)) {
    return true;
  }
  return (
    isIdent(node) && (hasIdentProperty || reservedIdentKeywords.has(value))
  );
}

/**
 * @param {import('../lib/tokenize.js').Term[]} arg
 * @return {{ terms: import('../lib/tokenize.js').Term[], hasNone: boolean } | null}
 */
function normalizeArg(arg) {
  /** @type {Record<string, import('../lib/tokenize.js').Term[]>} */
  const state = {
    timingFunction: [],
    property: [],
    time1: [],
    time2: [],
  };
  let hasIdentProperty = false;
  let hasNoneProperty = false;

  for (const node of arg) {
    const value = name(node);
    const time = classifyTime(node);
    if (time.isMath && time.dimension !== 'time') return null;

    if (isTimingFunction(value, node)) {
      if (state.timingFunction.length) return null;
      state.timingFunction.push(node);
    } else if (!state.time1.length && time.isNonNegative) {
      state.time1.push(node);
    } else if (
      state.time1.length &&
      !state.time2.length &&
      time.dimension === 'time'
    ) {
      state.time2.push(node);
    } else if (time.dimension === 'time') {
      return null;
    } else {
      if (isInvalidTransitionProperty(node, value, hasIdentProperty)) {
        return null;
      }
      if (isIdent(node)) {
        hasIdentProperty = true;
        if (value === 'none') {
          hasNoneProperty = true;
        }
      }
      state.property.push(node);
    }
  }

  return {
    hasNone: hasNoneProperty,
    terms: [
      ...state.property,
      ...state.time1,
      ...state.timingFunction,
      ...state.time2,
    ],
  };
}

/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
 */
function normalize(args) {
  const list = [];
  let hasNone = false;
  for (const arg of args) {
    const normalized = normalizeArg(arg);
    if (!normalized) return null;
    if (normalized.hasNone) {
      hasNone = true;
    }
    list.push(normalized.terms);
  }
  if (args.length > 1 && hasNone) {
    return null;
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
