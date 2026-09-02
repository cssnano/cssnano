import mathFunctions from '../lib/mathfunctions.js';
import {
  isDimension,
  isFunction,
  isNumber,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
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
const timeUnits = new Set(['ms', 's']);

/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {string}
 */
function unitFromNode(value, node) {
  if (isDimension(node)) {
    return /** @type {{ unit: string }} */ (
      node.tokens[0][4]
    ).unit.toLowerCase();
  }
  if (isFunction(node) && mathFunctions.has(value)) {
    for (const token of node.tokens) {
      if (token[0] === 'dimension-token' && token[4].unit !== '%')
        return token[4].unit.toLowerCase();
    }
  }
  return '';
}

/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isTimingFunction = (value, node) => {
  return (
    (isFunction(node) && timingFunctions.has(value)) ||
    timingKeywords.has(value)
  );
};
/**
 * @param {string} value
 * @return {boolean}
 */
const isDirection = (value) => {
  return directions.has(value);
};
/**
 * @param {string} value
 * @return {boolean}
 */
const isFillMode = (value) => {
  return fillModes.has(value);
};
/**
 * @param {string} value
 * @return {boolean}
 */
const isPlayState = (value) => {
  return playStates.has(value);
};
/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isTime = (value, node) => {
  const quantity = unitFromNode(value, node);

  return timeUnits.has(quantity);
};
/**
 * @param {string} value
 * @param {import('../lib/tokenize.js').Term} node
 * @return {boolean}
 */
const isIterationCount = (value, node) => {
  return value === 'infinite' || isNumber(node);
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
 * @return {import('../lib/tokenize.js').Term[][]}
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
 * @return {string}
 */
function normalizeAnimation(parsed) {
  return serializeArguments(normalize(parsed.arguments));
}

export default normalizeAnimation;
