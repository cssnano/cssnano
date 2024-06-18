'use strict';
const { unit } = require('postcss-value-parser');
const { getArguments } = require('cssnano-utils');
const addSpace = require('../lib/addSpace');
const getValue = require('../lib/getValue');
const mathFunctions = require('../lib/mathfunctions.js');

// animation: [ none | <keyframes-name> ] || <time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state>
const timingFunctions = new Set(['steps', 'cubic-bezier', 'frames']);
const timingKeywords = new Set([
  'ease',
  'ease-in',
  'ease-in-out',
  'ease-out',
  'linear',
  'step-end',
  'step-start',
]);

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
 * @param {import('postcss-value-parser').Node} node
 * @return {false | import('postcss-value-parser').Dimension}
 */
function unitFromNode(value, node) {
  if (node.type !== 'function') {
    return unit(value);
  }
  if (mathFunctions.has(value)) {
    // If it is a math function, it checks the unit of the parameter and returns it.
    for (const param of node.nodes) {
      const paramUnit = unitFromNode(param.value.toLowerCase(), param);
      if (paramUnit && paramUnit.unit && paramUnit.unit !== '%') {
        return paramUnit;
      }
    }
  }
  return false;
}

/**
 * @param {string} value
 * @param {import('postcss-value-parser').Node} node
 * @return {boolean}
 */
const isTimingFunction = (value, { type }) => {
  return (
    (type === 'function' && timingFunctions.has(value)) ||
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
 * @param {import('postcss-value-parser').Node} node
 * @return {boolean}
 */
const isTime = (value, node) => {
  const quantity = unitFromNode(value, node);

  return quantity && timeUnits.has(quantity.unit);
};
/**
 * @param {string} value
 * @param {import('postcss-value-parser').Node} node
 * @return {boolean}
 */
const isIterationCount = (value, node) => {
  const quantity = unitFromNode(value, node);

  return value === 'infinite' || (quantity && !quantity.unit);
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
 * @param {import('postcss-value-parser').Node[][]} args
 * @return {import('postcss-value-parser').Node[][]}
 */
function normalize(args) {
  const list = [];

  for (const arg of args) {
    /** @type {Record<string, import('postcss-value-parser').Node[]>} */
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

    arg.forEach((node) => {
      let { type, value } = node;

      if (type === 'space') {
        return;
      }

      value = value.toLowerCase();

      const hasMatch = stateConditions.some(({ property, delegate }) => {
        if (delegate(value, node) && !state[property].length) {
          state[property] = [node, addSpace()];
          return true;
        }
      });

      if (!hasMatch) {
        state.name = [...state.name, node, addSpace()];
      }
    });

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
 * @param {import('postcss-value-parser').ParsedValue} parsed
 * @return {string}
 */
module.exports = function normalizeAnimation(parsed) {
  const values = normalize(getArguments(parsed));

  return getValue(values);
};
