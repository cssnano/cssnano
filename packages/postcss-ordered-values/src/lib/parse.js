import { isTokenNode, parseListOfComponentValues } from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDimension,
  isTokenIdent,
  isTokenNumber,
  isTokenPercentage,
  tokenize,
} from '@csstools/css-tokenizer';

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes */
function stringify(nodes) {
  return nodes.map((node) => node.toString()).join('');
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function unit(node) {
  if (!isTokenNode(node)) return false;
  const token = node.value;
  if (!isTokenNumber(token) && !isTokenDimension(token) && !isTokenPercentage(token))
    return false;
  return {
    number: token[1],
    unit: isTokenDimension(token)
      ? token[4].unit.toLowerCase()
      : isTokenPercentage(token)
        ? '%'
        : '',
  };
}

/** @param {string} value */
function parse(value) {
  return parseListOfComponentValues(tokenize({ css: value }));
}

export { parse, stringify, unit };
