'use strict';
const { unit } = require('postcss-value-parser');
const { getArguments } = require('cssnano-utils');
const addSpace = require('../lib/addSpace');
const getValue = require('../lib/getValue');
const mathFunctions = require('../lib/mathfunctions.js');
const vendorUnprefixed = require('../lib/vendorUnprefixed.js');

// box-shadow: inset? && <length>{2,4} && <color>?

/**
 * @param {import('postcss-value-parser').ParsedValue} parsed
 * @return {string}
 */
module.exports = function normalizeBoxShadow(parsed) {
  const args = getArguments(parsed);

  const normalized = normalize(args);

  if (normalized === false) {
    return parsed.toString();
  }

  return getValue(normalized);
};
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
