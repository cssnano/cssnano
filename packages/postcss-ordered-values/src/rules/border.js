import { unit, stringify } from 'postcss-value-parser';
import * as R from 'ramda';
import isFunctionNode from '../lib/isFunctionNode';
import isMathFunctionNode from '../lib/isMathFunctionNode';
import isNodeValueOneOf from '../lib/isNodeValueOneOf';

// border: <line-width> || <line-style> || <color>
// outline: <outline-color> || <outline-style> || <outline-width>

const borderWidths = ['thin', 'medium', 'thick'];

const borderStyles = [
  'none',
  'auto', // only in outline-style
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
];

const isWordNode = R.propEq('type', 'word');

export default function normalizeBorder(border) {
  const order = { width: '', style: '', color: '' };

  border.walk((node) => {
    const { value } = node;
    if (isWordNode(node)) {
      if (isNodeValueOneOf(borderStyles, node)) {
        order.style = value;
        return false;
      }
      if (isNodeValueOneOf(borderWidths, node) || unit(value.toLowerCase())) {
        if (order.width !== '') {
          order.width = `${order.width} ${value}`;
          return false;
        }
        order.width = value;
        return false;
      }
      order.color = value;
      return false;
    }
    if (isFunctionNode(node)) {
      if (isMathFunctionNode(node)) {
        order.width = stringify(node);
      } else {
        order.color = stringify(node);
      }
      return false;
    }
  });

  return `${order.width} ${order.style} ${order.color}`.trim();
}
