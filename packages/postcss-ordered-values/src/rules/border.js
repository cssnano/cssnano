import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
} from '@csstools/css-parser-algorithms';
import { isTokenHash, isTokenIdent } from '@csstools/css-tokenizer';
import { getNumericUnit } from '../lib/parse.js';
import mathFunctions from '../lib/mathfunctions.js';

const borderWidths = new Set(['thin', 'medium', 'thick']);
const borderStyles = new Set([
  'none',
  'auto',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} border */
function normalizeBorder(border) {
  const order = { width: '', style: '', color: '' };
  for (const node of border) {
    if (isTokenNode(node) && isTokenIdent(node.value)) {
      const value = node.value[1];
      if (borderStyles.has(value.toLowerCase())) order.style = value;
      else if (borderWidths.has(value.toLowerCase()))
        order.width = order.width ? `${order.width} ${value}` : value;
      else order.color = value;
    } else if (isTokenNode(node) && isTokenHash(node.value)) {
      order.color = node.toString();
    } else if (isTokenNode(node) && getNumericUnit(node)) {
      const value = node.toString();
      order.width = order.width ? `${order.width} ${value}` : value;
    } else if (isFunctionNode(node) || isSimpleBlockNode(node)) {
      if (
        isFunctionNode(node) &&
        mathFunctions.has(node.getName().toLowerCase())
      )
        order.width = node.toString();
      else order.color = node.toString();
    } else if (isTokenNode(node) && node.value[0] === 'url-token') {
      order.color = node.toString();
    }
  }
  return `${order.width} ${order.style} ${order.color}`.trim();
}

export default normalizeBorder;
