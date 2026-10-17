/**
 * `!ie` or any other word after `!`, which IE 7 and older read as `!important`.
 * @param {import('postcss').Declaration} decl
 * @return {boolean}
 */
export default function important(decl) {
  const match = decl.value.match(/!\w/v);
  return Boolean(match?.index);
}
