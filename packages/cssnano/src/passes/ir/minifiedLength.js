/** @import {TokenLists} from './tokenLists.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */

/**
 * The bytes a declaration takes in minified output: its name, its value, the
 * colon and the separator after it. `!important` adds ten bytes.
 *
 * @param {TokenLists} tokenLists the run's lists, which hold the length of each value
 * @param {DeclarationRecord} declaration
 * @return {number}
 */
export function minifiedLength(tokenLists, declaration) {
  return (
    declaration.prop.length +
    tokenLists.textLength(declaration.valueList) +
    (declaration.important ? 10 : 0) +
    2
  );
}
