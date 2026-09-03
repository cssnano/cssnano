import {
  isFunction,
  isIdent,
  isNumber,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
import isTimeValue, { isMath } from '../lib/isTime.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

// animation: [ none | <keyframes-name> ] || <time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state>
const timingFunctions = new Set([...easingFunctions.functions, 'frames']);
const timingKeywords = new Set(easingFunctions.keywords);

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
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isTime = (value, node) => {
  return isTimeValue(node);
};
/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isIterationCount = (value, node) => {
  return (isIdent(node) && value === 'infinite') || isNumber(node);
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

    for (const node of arg) {
      const value = name(node);
      if (isMath(node) && !isTimeValue(node)) return null;

      const hasMatch = stateConditions.some(({ property, delegate }) => {
        if (delegate(value, node) && !state[property].length) {
          state[property].push(node);
          return true;
        } else {
          return false;
        }
      });

      if (!hasMatch) {
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
