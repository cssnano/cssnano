import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenComma } from '@csstools/css-tokenizer';
import { unit } from '../lib/parse.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };

const getArguments = (nodes) => {
  const result = [[]];
  for (const node of nodes) {
    if (isTokenNode(node) && isTokenComma(node.value)) result.push([]);
    else result.at(-1).push(node);
  }
  return result;
};
const timingFunctions = new Set(easingFunctions.keywords);
const timingFunctionNames = new Set(easingFunctions.functions);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} parsed */
function normalizeTransition(parsed) {
  const result = [];
  for (const arg of getArguments(parsed)) {
    const state = { timingFunction: [], property: [], time1: [], time2: [] };
    for (const node of arg) {
      if (node.type === 'whitespace') continue;
      const value = node.toString(), lower = value.toLowerCase();
      if (isFunctionNode(node) && timingFunctionNames.has(node.getName().toLowerCase())) state.timingFunction.push(value);
      else if (unit(node)) (state.time1.length ? state.time2 : state.time1).push(value);
      else if (timingFunctions.has(lower)) state.timingFunction.push(value);
      else state.property.push(value);
    }
    result.push([...state.property, ...state.time1, ...state.timingFunction, ...state.time2].join(' '));
  }
  return result.join(',');
}

export default normalizeTransition;
