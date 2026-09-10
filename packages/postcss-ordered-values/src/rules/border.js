import cssnanoUtils from 'cssnano-utils';
import { lengthUnits } from './columns.js';
import { isDimension, isFunction, isNumber, name } from '../lib/tokenize.js';

const { mathFunctions } = cssnanoUtils;

// border: <line-width> || <line-style> || <color>

const borderWidths = new Set(['thin', 'medium', 'thick']);

const borderStyles = new Set([
  'none',
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
const isWidth = (term, lower) => {
  if (isFunction(term)) return mathFunctions.has(lower);
  if (borderWidths.has(lower)) return true;
  if (isDimension(term)) {
    const unit = /** @type {{unit: string}} */ (term.tokens[0][4])?.unit;
    return typeof unit === 'string' && lengthUnits.has(unit.toLowerCase());
  }
  if (isNumber(term)) {
    const value = /** @type {{value: number}} */ (term.tokens[0][4])?.value;
    return value === 0;
  }
  return false;
};

/** @param {import('../lib/tokenize.js').Term} term @param {string} lower @param {boolean} allowAuto */
const isStyle = (term, lower, allowAuto) =>
  !isFunction(term) &&
  (borderStyles.has(lower) || (allowAuto && lower === 'auto'));

/** @param {import('../lib/tokenize.js').Term} term */
const isColor = (term) => !isNumber(term) && !isDimension(term);

/**
 * @typedef {'width' | 'style' | 'color'} BorderSlotName
 * @typedef {{ name: BorderSlotName, match: (term: import('../lib/tokenize.js').Term, lower: string) => boolean }} BorderSlot
 */

/**
 * @param {import('../lib/tokenize.js').Term[]} border
 * @param {boolean} [allowAuto]
 * @return {string | null}
 */
function normalizeBorder(border, allowAuto = false) {
  /** @type {BorderSlot[]} */
  const borderSlots = [
    { name: 'style', match: (term, lower) => isStyle(term, lower, allowAuto) },
    { name: 'width', match: isWidth },
    { name: 'color', match: isColor },
  ];
  /** @type {Record<BorderSlotName, string>} */
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
