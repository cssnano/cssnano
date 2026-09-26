import cssnanoUtils from 'cssnano-utils';
import vendorUnprefixed from './vendorUnprefixed.js';
import { parseMath } from './isTime.js';
import { isDimension, isFunction, isNumber, name } from './tokenize.js';

const { lengthUnits, mathFunctions } = cssnanoUtils;

/**
 * The lowercased CSS length unit of a single-token dimension, or null when
 * the term is not a dimension with a length unit.
 *
 * @param {import('./tokenize.js').Term} term
 * @return {string | null}
 */
export function lengthUnit(term) {
  if (!isDimension(term)) return null;
  const unit = /** @type {{unit: string}} */ (term.tokens[0][4])?.unit;
  return typeof unit === 'string' && lengthUnits.has(unit.toLowerCase())
    ? unit.toLowerCase()
    : null;
}

/**
 * A syntactically sound <length> component: a dimension carrying a CSS
 * length unit, or the unitless zero number.
 *
 * @param {import('./tokenize.js').Term} term
 * @return {boolean}
 */
export function isLength(term) {
  return (
    lengthUnit(term) !== null ||
    (isNumber(term) &&
      /** @type {{value: number}} */ (term.tokens[0][4])?.value === 0)
  );
}

/**
 * Resolve a math function's dimension in a <length> context. Only expressions
 * that resolve to a length match; number results, other dimensions, and
 * malformed or vendor-prefixed arithmetic fail closed so invalid CSS is left
 * byte-for-byte unchanged.
 *
 * @param {import('./tokenize.js').Term} node
 * @return {'length' | null}
 */
export function classifyMathLength(node) {
  if (!isFunction(node) || !mathFunctions.has(vendorUnprefixed(name(node)))) {
    return null;
  }
  return parseMath(node.tokens) === 'length' ? 'length' : null;
}
