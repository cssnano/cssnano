/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Whether two token lists spell the same text, compared token by token so
 * that no string is built.
 *
 * @param {readonly CSSToken[]} a
 * @param {readonly CSSToken[]} b
 * @return {boolean}
 */
export function sameTokenText(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (a[index][1] !== b[index][1]) return false;
  }
  return true;
}
