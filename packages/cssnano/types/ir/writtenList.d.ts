import type { TokenListId } from './tokenLists.js';
import type { BlockRecord, NodeEntry } from './blockRecord.js';
import type { DeclarationRecord } from './declarationRecord.js';
import type { RuleRecord } from './ruleRecord.js';
/** @import {TokenListId} from './tokenLists.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/**
 * The list a record's text is read from: its written list when it has one,
 * otherwise its identity list, which is the value list of a declaration and the
 * prelude of an at-rule. A rule's list is its written selector, which the build
 * sets; an edit that changed the rule's ids leaves none.
 *
 * @param {DeclarationRecord | RuleRecord | BlockRecord | NodeEntry} record
 * @return {TokenListId | -1}
 */
export declare function sourceListOf(record: DeclarationRecord | RuleRecord | BlockRecord | NodeEntry): TokenListId | -1;
//# sourceMappingURL=writtenList.d.ts.map