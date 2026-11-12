/** @import {TokenLists} from './tokenLists.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
import type { TokenLists } from './tokenLists.js';
import type { DeclarationRecord } from './declarationRecord.js';
/**
 * The bytes a declaration takes in minified output: its name, its value, the
 * colon and the separator after it. `!important` adds ten bytes.
 *
 * @param {TokenLists} tokenLists the run's lists, which hold the length of each value
 * @param {DeclarationRecord} declaration
 * @return {number}
 */
export declare function minifiedLength(tokenLists: TokenLists, declaration: DeclarationRecord): number;
//# sourceMappingURL=minifiedLength.d.ts.map