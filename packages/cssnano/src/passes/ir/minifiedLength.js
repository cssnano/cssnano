/**
 * The bytes a declaration takes in minified output: its name, its value, the
 * colon and the separator after it. `!important` adds ten bytes.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {number}
 */
export function minifiedLength(declaration) {
  return (
    declaration.prop.length +
    declaration.value.length +
    (declaration.important ? 10 : 0) +
    2
  );
}
