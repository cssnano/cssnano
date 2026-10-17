/**
 * A value ending in `\9`, which only IE 6 to 8 read.
 * @param {import('postcss').Declaration} decl
 * @return {boolean}
 */
export default function slash9(decl) {
  const v = decl.value;
  return Boolean(v) && v.length > 2 && v.indexOf('\\9') === v.length - 2;
}
