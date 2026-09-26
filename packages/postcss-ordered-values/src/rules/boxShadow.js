import cssnanoUtils from 'cssnano-utils';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';
import { classifyMathLength, isLength } from '../lib/isLength.js';
import {
  isFunction,
  isHash,
  isIdent,
  isUrl,
  name,
  reservedIdentKeywords,
  serializeArguments,
} from '../lib/tokenize.js';

const { mathFunctions } = cssnanoUtils;

// Color-producing functions per CSS Color 4/5. Anything else is not a
// <color> value and must not be reordered as one.
const colorFunctions = new Set([
  'color',
  'color-mix',
  'device-cmyk',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'light-dark',
  'oklab',
  'oklch',
  'rgb',
  'rgba',
]);

/** @param {import('../lib/tokenize.js').Term} term @param {string} lower */
const isColor = (term, lower) => {
  if (isIdent(term)) {
    return (
      lower !== 'none' && lower !== 'auto' && !reservedIdentKeywords.has(lower)
    );
  }
  if (isFunction(term)) {
    return !isUrl(term) && colorFunctions.has(vendorUnprefixed(lower));
  }
  return isHash(term);
};

/**
 * @param {import('../lib/tokenize.js').Term[][]} args
 * @return {import('../lib/tokenize.js').Term[][] | null}
 */
function normalize(args) {
  const list = [];
  let hasNone = false;
  for (const arg of args) {
    if (arg.length === 1 && isIdent(arg[0]) && name(arg[0]) === 'none') {
      hasNone = true;
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

      if (isFunction(node) && vendorUnprefixed(value) === 'inset') {
        return null;
      }

      if (isLength(node)) {
        val.push(node);
      } else if (
        isFunction(node) &&
        mathFunctions.has(vendorUnprefixed(value))
      ) {
        // Math is only usable as a length here; anything else fails closed
        // rather than being reclassified as a color.
        if (classifyMathLength(node) === null) return null;
        val.push(node);
      } else if (isIdent(node) && value === 'inset') {
        state.inset.push(node);
      } else if (isColor(node, value)) {
        state.color.push(node);
      } else {
        return null;
      }
    }

    if (val.length < 2 || val.length > 4 || state.color.length > 1) {
      return null;
    }

    list.push([...state.inset, ...val, ...state.color]);
  }
  if (args.length > 1 && hasNone) {
    return null;
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
