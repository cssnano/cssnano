/**
 * A value ending in `\9`, which only IE 6 to 8 read.
 * @param {string} v
 * @return {boolean}
 */
export default function slash9(v) {
  return Boolean(v) && v.length > 2 && v.indexOf('\\9') === v.length - 2;
}
