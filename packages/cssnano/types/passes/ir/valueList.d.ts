import type { TokenLists, TokenListId } from './tokenLists.js';
import type { ValueIds } from './valueIds.js';
import type { TextTable } from '../../values/textTable.js';
import type { Declaration } from 'postcss';
export type ValueTables = {
    textTable: TextTable;
    tokenLists: TokenLists;
    valueIds: ValueIds;
};
/**
 * The id of the value a declaration's record holds. A value with an important
 * comment is kept as written, since the comment is part of what the author kept;
 * any other value is the cleaned `value`, which PostCSS gives. The id interns
 * the text, so a value new to the run is tokenized once, in its property's mode.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @return {TokenListId}
 */
export declare function valueListOf(node: Declaration, tables: ValueTables): TokenListId;
/**
 * The list of a declaration's value as written, when the value list does not
 * spell it: a cleaned value that dropped a plain comment. A value kept as
 * written, and a value PostCSS cleaned of nothing, have none, so -1.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @return {TokenListId | -1}
 */
export declare function writtenValueListOf(node: Declaration, tables: ValueTables): TokenListId | -1;
//# sourceMappingURL=valueList.d.ts.map