import { unit } from '../lib/parse.js';
import cssnanoUtils from 'cssnano-utils';
import addSpace from '../lib/addSpace.js';
import getValue from '../lib/getValue.js';
import mathFunctions from '../lib/mathfunctions.js';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';

const { getArguments } = cssnanoUtils;
/**
 * @param {import('postcss-value-parser').Node[][]} args
 * @return {false | import('postcss-value-parser').Node[][]}
 */
function normalize(args) {
  const list = [];
  let abort = false;
  for (const arg of args) {
    /** @type {import('postcss-value-parser').Node[]} */
    let val = [];
    /** @type {Record<'inset'|'color', import('postcss-value-parser').Node[]>} */
    const state = {
      inset: [],
      color: [],
    };

    for (const node of arg) {
      const { type, value } = node;

      if (
        type === 'function' &&
        mathFunctions.has(vendorUnprefixed(value.toLowerCase()))
      ) {
        abort = true;
        continue;
      }

      if (type === 'space') {
        continue;
      }

      if (unit(value)) {
        val = [...val, node, addSpace()];
      } else if (value.toLowerCase() === 'inset') {
        state.inset = [...state.inset, node, addSpace()];
      } else {
        state.color = [...state.color, node, addSpace()];
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
 * @param {import('postcss-value-parser').ParsedValue} parsed
 * @return {string}
 */
function normalizeBoxShadow(parsed) {
  const args = getArguments(parsed);
  const normalized = normalize(args);
  if (normalized === false) {
    return parsed.toString();
  }
  return getValue(normalized);
}

export default normalizeBoxShadow;
