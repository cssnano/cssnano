import cssnanoUtils from '#utils';

const { asciiLowerCase } = cssnanoUtils;

/** @import {TokenizeMode} from './valueBuffer.js' */

/* Only `unicode-range` reads a `U+` range as one token. */
const unicodeRangeMode = Object.freeze({ unicodeRangesAllowed: true });

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
