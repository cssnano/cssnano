import {
  isFunction,
  isIdent,
  isNumber,
  isString,
  isUrl,
  name,
  reservedIdentKeywords,
  serializeArguments,
} from '../lib/tokenize.js';
import { easingKeywords, easingFunctionNames } from '../lib/easingSets.js';
import classifyTime from '../lib/isTime.js';

// animation: [ none | <keyframes-name> ] || <time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state>
const timingFunctions = new Set([...easingFunctionNames, 'frames']);
const timingKeywords = easingKeywords;

const directions = new Set([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
]);
const fillModes = new Set(['none', 'forwards', 'backwards', 'both']);
const playStates = new Set(['running', 'paused']);
/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isTimingFunction = (value, node) => {
  return (
    (isFunction(node) && timingFunctions.has(value)) ||
    (isIdent(node) && timingKeywords.has(value))
  );
};
/** @param {string} value @param {import('../lib/tokenize.js').Term} node */
const isDirection = (value, node) => {
  return isIdent(node) && directions.has(value);
};
/** @param {string} value @param {import('../lib/tokenize.js').Term} node */
const isFillMode = (value, node) => {
  return isIdent(node) && fillModes.has(value);
};
/** @param {string} value @param {import('../lib/tokenize.js').Term} node */
const isPlayState = (value, node) => {
  return isIdent(node) && playStates.has(value);
};
/**
 * A non-negative count per CSS Animations 1: <number [0,∞]> | infinite.
 * Negative numbers are not iteration counts and fail closed via the name slot.
 *
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isIterationCount = (value, node) => {
  if (isIdent(node) && value === 'infinite') return true;
  if (!isNumber(node)) return false;
  const { value: count, signCharacter } =
    /** @type {{value: number, signCharacter?: string}} */ (node.tokens[0][4]);
  return signCharacter !== '-' && count >= 0;
};

/**
 * @param {import('../lib/tokenize.js').Term} node
 * @param {string} value
 * @param {boolean} hasIdentOrStringName
 * @return {boolean}
 */
function isInvalidAnimationName(node, value, hasIdentOrStringName) {
  if (!isIdent(node) && !isString(node) && !isFunction(node)) {
    return true;
  }
  if (isUrl(node)) {
    return true;
  }
  if ((isIdent(node) || isString(node)) && hasIdentOrStringName) {
    return true;
  }
  return isIdent(node) && reservedIdentKeywords.has(value);
}

const stateConditions = [
  { property: 'timingFunction', delegate: isTimingFunction },
  { property: 'iterationCount', delegate: isIterationCount },
  { property: 'direction', delegate: isDirection },
  { property: 'fillMode', delegate: isFillMode },
  { property: 'playState', delegate: isPlayState },
];
/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
 */
function normalize(args) {
  const list = [];

  for (const arg of args) {
    /** @type {Record<string, import('../lib/tokenize.js').Term[]>} */
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
    let hasIdentOrStringName = false;

    for (const node of arg) {
      const value = name(node);
      const time = classifyTime(node);
      if (time.isMath && time.dimension !== 'time') return null;

      if (time.dimension === 'time') {
        if (!state.duration.length && time.isNonNegative) {
          state.duration.push(node);
        } else if (state.duration.length && !state.delay.length) {
          state.delay.push(node);
        } else {
          return null;
        }
        continue;
      }

      const hasMatch = stateConditions.some(({ property, delegate }) => {
        if (delegate(value, node) && !state[property].length) {
          state[property].push(node);
          return true;
        } else {
          return false;
        }
      });

      if (!hasMatch) {
        if (isInvalidAnimationName(node, value, hasIdentOrStringName)) {
          return null;
        }
        if (isIdent(node) || isString(node)) {
          hasIdentOrStringName = true;
        }
        state.name.push(node);
      }
    }

    list.push([
      ...state.name,
      ...state.duration,
      ...state.timingFunction,
      ...state.delay,
      ...state.iterationCount,
      ...state.direction,
      ...state.fillMode,
      ...state.playState,
    ]);
  }
  return list;
}
/**
 * @param {{ arguments: import('../lib/tokenize.js').Term[][] }} parsed
 * @return {string | null}
 */
function normalizeAnimation(parsed) {
  const normalized = normalize(parsed.arguments);
  return normalized === null ? null : serializeArguments(normalized);
}

export default normalizeAnimation;
