import { list } from 'postcss';

/**
 * Spreads the one to four values of a top/right/bottom/left shorthand over the
 * four sides: a missing right repeats top, bottom repeats top, left repeats
 * right.
 *
 * @template T
 * @param {T[]} s
 * @return {[T, T, T, T]}
 */
export function expandFourSides(s) {
  return [
    s[0], // top
    s[1] || s[0], // right
    s[2] || s[0], // bottom
    s[3] || s[1] || s[0], // left
  ];
}

/**
 * @param {unknown[]} sides - four expanded sides, or keys that compare equal
 * when the sides do
 * @return {number} how many leading sides a shorthand needs to say them all
 */
export function fourSideCount(sides) {
  if (sides[3] !== sides[1]) return 4;
  if (sides[2] !== sides[0]) return 3;
  return sides[0] === sides[1] ? 1 : 2;
}

/** @param {string | string[]} v */
export default (v) =>
  expandFourSides(typeof v === 'string' ? list.space(v) : v);
