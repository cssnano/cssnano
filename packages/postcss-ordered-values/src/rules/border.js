import mathFunctions from '../lib/mathfunctions.js';
import { isDimension, isFunction, name } from '../lib/tokenize.js';

// border: <line-width> || <line-style> || <color>
// outline: <outline-color> || <outline-style> || <outline-width>

const borderWidths = new Set(['thin', 'medium', 'thick']);

const borderStyles = new Set([
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
]);

/**
 * @param {import('../lib/tokenize.js').Term[]} border
 * @return {string}
 */
function normalizeBorder(border) {
  const order = { width: '', style: '', color: '' };

  for (const term of border) {
    const value = term.raw;
    const lower = name(term);
    if (!isFunction(term)) {
      if (borderStyles.has(lower)) {
        order.style = value;
      } else if (
        borderWidths.has(lower) ||
        isDimension(term) ||
        /^[-+]?\d/.test(value)
      ) {
        if (order.width !== '') {
          order.width = `${order.width} ${value}`;
          continue;
        }
        order.width = value;
      } else {
        order.color = value;
      }
    } else {
      if (mathFunctions.has(lower)) {
        order.width = value;
      } else {
        order.color = value;
      }
    }
  }
  return `${order.width} ${order.style} ${order.color}`.trim();
}

export default normalizeBorder;
