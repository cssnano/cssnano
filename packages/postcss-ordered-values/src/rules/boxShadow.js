import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenComma } from '@csstools/css-tokenizer';
import { stringify, unit } from '../lib/parse.js';
import mathFunctions from '../lib/mathfunctions.js';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';

const getArguments = (nodes) => {
  const result = [[]];
  for (const node of nodes) {
    if (isTokenNode(node) && isTokenComma(node.value)) result.push([]);
    else result.at(-1).push(node);
  }
  return result;
};

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} parsed */
function normalizeBoxShadow(parsed) {
  const result = [];
  for (const arg of getArguments(parsed)) {
    const inset = [], lengths = [], color = [];
    for (const node of arg) {
      if (node.type === 'whitespace') continue;
      if (isFunctionNode(node) && mathFunctions.has(vendorUnprefixed(node.getName().toLowerCase()))) return stringify(parsed);
      const value = node.toString();
      if (unit(node)) lengths.push(value);
      else if (value.toLowerCase() === 'inset') inset.push(value);
      else color.push(value);
    }
    result.push([...inset, ...lengths, ...color].join(' '));
  }
  return result.join(',');
}

export default normalizeBoxShadow;
