import mathFunctions from '../lib/mathfunctions.js';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';
import {
  isDimension,
  isFunction,
  name,
  serializeArguments,
} from '../lib/tokenize.js';
/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {false | import('../lib/tokenize.js').Term[][]}
 */
function normalize(args) {
  const list = [];
  let abort = false;
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
        abort = true;
        continue;
      }

      if (isDimension(node) || /^[-+]?\d/.test(node.raw)) {
        val.push(node);
      } else if (value === 'inset') {
        state.inset.push(node);
      } else {
        state.color.push(node);
      }
    }

    if (abort) {
      return false;
    }

    list.push([...state.inset, ...val, ...state.color]);
  }
  return list;
}
/**
 * @param {{ arguments: import('../lib/tokenize.js').Term[][], value: string }} parsed
 * @return {string}
 */
function normalizeBoxShadow(parsed) {
  const normalized = normalize(parsed.arguments);
  if (normalized === false) {
    return parsed.value;
  }
  return serializeArguments(normalized);
}

export default normalizeBoxShadow;
