import {
  counter,
  counterStyle,
  cssWideKeywords,
  grid,
  keyframes,
  predefinedCounterStyles,
} from './slots.js';

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const REMAINDER_CHARACTERS = `${LETTERS}0123456789-_`;

// Reserve every word that would make a generated identifier unusable.
// existing keywords and predefined counter styles a user style could shadow.
const RESERVED_WORDS = new Set([
  ...cssWideKeywords,
  ...keyframes.reservedKeywords,
  ...counterStyle.reservedKeywords,
  ...counter.reservedKeywords,
  ...grid.reservedKeywords,
  ...predefinedCounterStyles,
  'inline',
  'list-item',
  'page',
]);

/**
 * The leading letter counts in base 52, each
 * suffix character in base 64, worth one more than its alphabet index.
 * The arithmetic runs on IEEE-754 doubles, so it is exact only while the
 * positions stay within Number.MAX_SAFE_INTEGER — around nine quadrillion
 * renames in one plugin lifetime, orders of magnitude past any stylesheet.
 * @param {string} word
 * @return {number | undefined}
 */
function reservedPosition(word) {
  const lead = LETTERS.indexOf(word[0]);
  if (lead < 0) return undefined;
  let position = lead;
  let place = 1;
  for (let i = 1; i < word.length; i++) {
    const digit = REMAINDER_CHARACTERS.indexOf(word[i]);
    if (digit < 0) return undefined;
    position += (digit + 1) * 52 * place;
    place *= 64;
  }
  return position;
}

/** @type {number[]} */
const RESERVED_POSITIONS = [];

for (const word of RESERVED_WORDS) {
  const position = reservedPosition(word);
  if (position !== undefined) {
    RESERVED_POSITIONS.push(position);
  }
}
RESERVED_POSITIONS.sort((a, b) => a - b);
/**
 * Count reserved positions at or below a candidate by bisecting the list.
 * @param {number} position
 * @return {number}
 */
function reservedUpTo(position) {
  let low = 0;
  let high = RESERVED_POSITIONS.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (RESERVED_POSITIONS[middle] <= position) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/**
 * @param {number} num
 * @return {string}
 */
function plain(num) {
  let base = 52;
  let characters = LETTERS;
  let character = num % base;
  let result = characters[character];
  let remainder = Math.floor(num / base);

  if (remainder) {
    base = 64;
    characters = `${characters}0123456789-_`;

    while (remainder) {
      remainder--;
      character = remainder % base;
      remainder = Math.floor(remainder / base);
      result = result + characters[character];
    }
  }
  return result;
}

/**
 * Map an index to an identifier.
 *
 * @param {number} num
 * @return {string}
 */
function encode(num) {
  let position = num;
  for (;;) {
    const stepped = num + reservedUpTo(position);
    if (stepped === position) return plain(position);
    position = stepped;
  }
}

export default encode;
