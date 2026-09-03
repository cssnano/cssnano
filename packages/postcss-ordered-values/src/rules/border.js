import mathFunctions from '../lib/mathfunctions.js';
import { isDimension, isFunction, isNumber, name } from '../lib/tokenize.js';

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
 * @return {string | null}
 */
function normalizeBorder(border) {
  const order = { width: '', style: '', color: '' };
  let hasWidth = false;
  let hasStyle = false;
  let hasColor = false;

  for (const term of border) {
    if (term.raw === '/' && term.tokens.length === 1) return null;
    const value = term.raw;
    const lower = name(term);
    if (!isFunction(term)) {
      if (borderStyles.has(lower)) {
        if (hasStyle) return null;
        hasStyle = true;
        order.style = value;
      } else if (
        borderWidths.has(lower) ||
        isDimension(term) ||
        isNumber(term)
      ) {
        if (hasWidth) return null;
        hasWidth = true;
        order.width = value;
      } else {
        if (hasColor) return null;
        hasColor = true;
        order.color = value;
      }
    } else {
      if (mathFunctions.has(lower)) {
        if (hasWidth) return null;
        hasWidth = true;
        order.width = value;
      } else {
        if (hasColor) return null;
        hasColor = true;
        order.color = value;
      }
    }
  }
  return [order.width, order.style, order.color].filter(Boolean).join(' ');
}

export default normalizeBorder;
