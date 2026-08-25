import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDelim,
  isTokenDimension,
  isTokenNumber,
  isTokenPercentage,
  tokenize,
} from '@csstools/css-tokenizer';

/** @param {string} value */
function parse(value) {
  return parseListOfComponentValues(tokenize({ css: value }));
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes */
function stringify(nodes) {
  let output = '';
  for (const node of nodes) {
    if (isFunctionNode(node) || isSimpleBlockNode(node)) {
      const source = node.toString();
      const original = node.value.map((child) => child.toString()).join('');
      output += source.replace(original, stringify(node.value));
    } else output += node.toString();
  }
  return output;
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isComma(node) {
  return isTokenNode(node) && isTokenComma(node.value);
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isSlash(node) {
  return isTokenNode(node) && isTokenDelim(node.value) && node.value[1] === '/';
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isNumeric(node) {
  return (
    isTokenNode(node) &&
    (isTokenNumber(node.value) ||
      isTokenDimension(node.value) ||
      isTokenPercentage(node.value))
  );
}

export { isComma, isNumeric, isSlash, parse, stringify };
