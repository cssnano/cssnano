import type { CSSToken } from '@csstools/css-tokenizer';
import type { DeclarationRecord } from './declarationRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type { BlockRecord, NodeEntry } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { TokenLists } from './tokenLists.js';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/**
 * The value a declaration holds, as PostCSS's `decl.value` spells it. A list
 * without comments is the value itself, and a list that keeps an important
 * comment spells the value without its comments, trimmed.
 *
 * @param {TokenLists} tokenLists
 * @param {DeclarationRecord} record
 * @return {string}
 */
export declare function declaredValue(tokenLists: TokenLists, record: DeclarationRecord): string;
/**
 * The tokens that spell a declared value. A value list that spells the value
 * as written is the list itself; otherwise the value is tokenized once.
 *
 * @param {TokenLists} tokenLists
 * @param {DeclarationRecord} record
 * @param {string} value the result of `declaredValue`
 * @return {readonly CSSToken[]}
 */
export declare function declaredValueTokens(tokenLists: TokenLists, record: DeclarationRecord, value: string): readonly CSSToken[];
/**
 * The record of an at-rule, which holds a name and a prelude.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {BlockRecord | NodeEntry}
 */
export declare function atRuleAt(records: BlockRecords, index: ArenaIndex): BlockRecord | NodeEntry;
/**
 * The tokens of an at-rule's prelude, empty when it has none.
 *
 * @param {TokenLists} tokenLists
 * @param {{preludeId: number}} entry
 * @return {readonly CSSToken[]}
 */
export declare function preludeListOf(tokenLists: TokenLists, entry: {
    preludeId: number;
}): readonly CSSToken[];
/**
 * The prelude of an at-rule as PostCSS's `params` spells it, which the list
 * holds as interned.
 *
 * @param {TokenLists} tokenLists
 * @param {{preludeId: number}} entry
 * @return {string}
 */
export declare function preludeTextOf(tokenLists: TokenLists, entry: {
    preludeId: number;
}): string;
//# sourceMappingURL=declaredText.d.ts.map