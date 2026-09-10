import cssnanoUtils from 'cssnano-utils';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';
import { lengthUnits } from './columns.js';
import {
  isDimension,
  isFunction,
  isIdent,
  isNumber,
  name,
  serializeArguments,
} from '../lib/tokenize.js';

const { mathFunctions } = cssnanoUtils;

/** @param {import('../lib/tokenize.js').Term} term */
function isLength(term) {
  if (isDimension(term)) {
    const unit = /** @type {{unit: string}} */ (term.tokens[0][4])?.unit;
    return typeof unit === 'string' && lengthUnits.has(unit.toLowerCase());
  }
  if (isNumber(term)) {
    const value = /** @type {{value: number}} */ (term.tokens[0][4])?.value;
    return value === 0;
  }
  return false;
}

/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
 */
function normalize(args) {
  const list = [];
  for (const arg of args) {
    if (arg.length === 1 && isIdent(arg[0]) && name(arg[0]) === 'none') {
      list.push(arg);
      continue;
    }
    /** @type {import('../lib/tokenize.js').Term[]} */
    const val = [];
    /** @type {Record<'inset'|'color', import('../lib/tokenize.js').Term[]>} */
    const state = {
      inset: [],
      color: [],
    };

    for (const node of arg) {
      const value = name(node);

      if (isFunction(node) && mathFunctions.has(vendorUnprefixed(value))) {
        return null;
      }

      if (isFunction(node) && vendorUnprefixed(value) === 'inset') {
        return null;
      }

      if (isLength(node)) {
        val.push(node);
      } else if (isIdent(node) && value === 'inset') {
        state.inset.push(node);
      } else {
        state.color.push(node);
      }
    }

    if (val.length < 2 || val.length > 4) {
      return null;
    }

    list.push([...state.inset, ...val, ...state.color]);
  }
  return list;
}
/**
 * @param {{ arguments: import('../lib/tokenize.js').Term[][], value: string }} parsed
 * @return {string | null}
 */
function normalizeBoxShadow(parsed) {
  const normalized = normalize(parsed.arguments);
  return normalized === null ? null : serializeArguments(normalized);
}

export default normalizeBoxShadow;
