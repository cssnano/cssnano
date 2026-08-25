import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenComma } from '@csstools/css-tokenizer';
import { unit } from '../lib/parse.js';
import mathFunctions from '../lib/mathfunctions.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

const getArguments = (nodes) => {
  const result = [[]];
  for (const node of nodes) {
    if (isTokenNode(node) && isTokenComma(node.value)) result.push([]);
    else result.at(-1).push(node);
  }
  return result;
};
const timingFunctions = new Set([...easingFunctions.functions, 'frames']);
const timingKeywords = new Set(easingFunctions.keywords);
const directions = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse']);
const fillModes = new Set(['none', 'forwards', 'backwards', 'both']);
const playStates = new Set(['running', 'paused']);
const timeUnits = new Set(['ms', 's']);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function unitFromNode(node) {
  const quantity = unit(node);
  if (quantity) return quantity;
  if (isFunctionNode(node) && mathFunctions.has(node.getName().toLowerCase())) {
    for (const child of node.value) {
      const childUnit = unitFromNode(child);
      if (childUnit?.unit && childUnit.unit !== '%') return childUnit;
    }
  }
  return false;
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} parsed */
function normalizeAnimation(parsed) {
  const result = [];
  for (const arg of getArguments(parsed)) {
    const state = { name: [], duration: [], timingFunction: [], delay: [], iterationCount: [], direction: [], fillMode: [], playState: [] };
    for (const node of arg) {
      if (node.type === 'whitespace') continue;
      const value = node.toString(), lower = value.toLowerCase(), quantity = unitFromNode(node);
      let property;
      if (quantity && timeUnits.has(quantity.unit)) property = state.duration.length ? 'delay' : 'duration';
      else if ((isFunctionNode(node) && timingFunctions.has(node.getName().toLowerCase())) || timingKeywords.has(lower)) property = 'timingFunction';
      else if (lower === 'infinite' || (quantity && !quantity.unit)) property = 'iterationCount';
      else if (directions.has(lower)) property = 'direction';
      else if (fillModes.has(lower)) property = 'fillMode';
      else if (playStates.has(lower)) property = 'playState';
      if (property && !state[property].length) state[property].push(value);
      else state.name.push(value);
    }
    result.push(Object.values(state).flat().join(' '));
  }
  return result.join(',');
}

export default normalizeAnimation;
