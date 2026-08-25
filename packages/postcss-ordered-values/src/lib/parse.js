import {
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenDimension,
  isTokenNumber,
  isTokenPercentage,
  tokenize,
} from '@csstools/css-tokenizer';

/**
 * Serialize immutable CSSTools component values without reconstructing their
 * source. Reducers receive immutable ComponentValue[] and must not construct
 * legacy postcss-value-parser node shapes.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 */
function serializeComponentValues(nodes) {
  return nodes.map((node) => node.toString()).join('');
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function getNumericUnit(node) {
  if (!isTokenNode(node)) return undefined;
  const token = node.value;
  if (
    !isTokenNumber(token) &&
    !isTokenDimension(token) &&
    !isTokenPercentage(token)
  )
    return undefined;
  let tokenUnit = '';
  if (isTokenDimension(token)) tokenUnit = token[4].unit.toLowerCase();
  else if (isTokenPercentage(token)) tokenUnit = '%';
  return { number: token[1], unit: tokenUnit };
}

/** @param {string} value */
function parseComponentValues(value) {
  return parseListOfComponentValues(tokenize({ css: value }));
}

export { parseComponentValues, serializeComponentValues, getNumericUnit };
