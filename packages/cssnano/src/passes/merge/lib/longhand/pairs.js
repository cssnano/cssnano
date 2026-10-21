import { list } from 'postcss';

/**
 * An axis shorthand takes a start and an end; a lone value sets both.
 *
 * @param {string | string[]} v
 * @return {string[]}
 */
export function parsePair(v) {
  const s = typeof v === 'string' ? list.space(v) : v;
  return [s[0], s[1] || s[0]];
}

/**
 * @param {string | string[]} v
 * @return {string}
 */
export function minifyPair(v) {
  const [start, end] = parsePair(v);
  return start === end ? start : `${start} ${end}`;
}
