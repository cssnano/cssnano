import cssnanoUtils from '#utils';

const { asciiLowerCase } = cssnanoUtils;

/** @import {TokenizeMode} from './valueBuffer.js' */

/* Only `unicode-range` reads a `U+` range as one token. */
const unicodeRangeMode = Object.freeze({ unicodeRangesAllowed: true });

/**
 * The tokenizer mode of the values of a property, given its keys, which fold
 * the name. It equals `tokenizeMode` of a name without escapes.
 *
 * @param {{ unicodeRange: boolean }} keys
 * @return {TokenizeMode | undefined} undefined for the default mode
 */
export function tokenizeModeOfKeys(keys) {
  return keys.unicodeRange ? unicodeRangeMode : undefined;
}

/**
 * The tokenizer mode for the values of a property. The name is matched in
 * ASCII case, as CSS property names are.
 *
 * @param {string} property
 * @return {TokenizeMode | undefined} undefined for the default mode
 */
export function tokenizeMode(property) {
  return asciiLowerCase(property) === 'unicode-range'
    ? unicodeRangeMode
    : undefined;
}
