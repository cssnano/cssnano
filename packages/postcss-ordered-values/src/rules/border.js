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

/** @param {import('../lib/tokenize.js').Term} term @param {string} lower */
const isWidth = (term, lower) =>
  isFunction(term)
    ? mathFunctions.has(lower)
    : borderWidths.has(lower) || isDimension(term) || isNumber(term);

/** @param {import('../lib/tokenize.js').Term} term @param {string} lower */
const isStyle = (term, lower) => !isFunction(term) && borderStyles.has(lower);

/** @type {readonly { name: 'width' | 'style' | 'color', match: (term: import('../lib/tokenize.js').Term, lower: string) => boolean }[]} */
const borderSlots = [
  { name: 'style', match: isStyle },
  { name: 'width', match: isWidth },
  { name: 'color', match: () => true },
];

/**
 * @param {import('../lib/tokenize.js').Term[]} border
 * @return {string | null}
 */
function normalizeBorder(border) {
  const order = { width: '', style: '', color: '' };

  for (const term of border) {
    if (term.raw === '/' && term.tokens.length === 1) return null;
    const lower = name(term);
    const slot = borderSlots.find((s) => s.match(term, lower));
    if (!slot || order[slot.name]) return null;
    order[slot.name] = term.raw;
  }
  return [order.width, order.style, order.color].filter(Boolean).join(' ');
}

export default normalizeBorder;
