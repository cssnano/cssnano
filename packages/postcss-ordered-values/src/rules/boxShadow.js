import mathFunctions from '../lib/mathfunctions.js';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';
import {
  isDimension,
  isFunction,
  isIdent,
  isNumber,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
 */
function normalize(args) {
  const list = [];
  for (const arg of args) {
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

      if (isDimension(node) || isNumber(node)) {
        val.push(node);
      } else if (isIdent(node) && value === 'inset') {
        state.inset.push(node);
      } else {
        state.color.push(node);
      }
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
