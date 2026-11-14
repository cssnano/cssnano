import type { TokenLists, TokenListId } from './tokenLists.js';
import type { ValueIds } from './valueIds.js';
import type { Declaration } from 'postcss';
export type ValueTables = {
    tokenLists: TokenLists;
    valueIds: ValueIds;
};
/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/** @import {ValueIds} from './valueIds.js' */
/** @import {Declaration} from 'postcss' */
/**
 * The tables a declaration's value is interned in: its token lists and value
 * ids.
 *
 * @typedef {{ tokenLists: TokenLists, valueIds: ValueIds }} ValueTables
 */
/**
 * Whether a value as written holds an important comment, which the cleaned
 * value would drop. Only a value with a comment start is tokenized.
 *
 * @param {string} written the value as written
 * @return {boolean}
 */
export declare function keepsValueAsWritten(written: string): boolean;
/**
 * The id of the value a declaration's record holds. A value with an important
 * comment is kept as written, since the comment is part of what the author kept;
 * any other value is the cleaned `value`, which PostCSS gives. The id interns
 * the text, so a value new to the run is tokenized once, in its property's mode.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @param {string} written the value as written, which the caller reads once
 * @param {boolean} kept whether the value keeps an important comment
 * @return {TokenListId}
 */
export declare function valueListOf(node: Declaration, tables: ValueTables, written: string, kept: boolean): TokenListId;
/**
 * The list of a declaration's value as written, when the value list does not
 * spell it: a cleaned value that dropped a plain comment. A value kept as
 * written, and a value PostCSS cleaned of nothing, have none, so -1.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @param {string} written the value as written, which the caller reads once
 * @param {boolean} kept whether the value keeps an important comment
 * @return {TokenListId | -1}
 */
export declare function writtenValueListOf(node: Declaration, tables: ValueTables, written: string, kept: boolean): TokenListId | -1;
//# sourceMappingURL=valueList.d.ts.map