import type { BlockRecord, NodeEntry } from './blockRecord.js';
import type { TokenLists } from './tokenLists.js';
/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {TokenListId, TokenLists} from './tokenLists.js' */
/**
 * The text a rule's or at-rule's raw separator follows: the last selector, or
 * the prelude.
 *
 * @param {TokenLists} tokenLists
 * @param {BlockRecord | NodeEntry | import('./ruleRecord.js').RuleRecord} record
 * @return {string}
 */
export declare function headText(tokenLists: TokenLists, record: BlockRecord | NodeEntry | import('./ruleRecord.js').RuleRecord): string;
//# sourceMappingURL=headText.d.ts.map