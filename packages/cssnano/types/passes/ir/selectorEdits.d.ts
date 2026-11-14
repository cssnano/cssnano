import type { RuleRecord } from './ruleRecord.js';
import type { TokenListId } from './tokenLists.js';
import type { RunContext } from './runContext.js';
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TokenListId} from './tokenLists.js' */
/** @import {RunContext} from './runContext.js' */
/**
 * Gives a rule the ids of its selector items and marks it, so write-back
 * writes its selector from them.
 *
 * @param {RuleRecord} record
 * @param {readonly TokenListId[]} ids
 * @return {void}
 */
export declare function writeSelectorIds(record: RuleRecord, ids: readonly TokenListId[]): void;
/**
 * Writes the selector of a rule as the folded text `list`: its items, split at
 * the commas outside parentheses, become the rule's ids, each interned in the
 * run. The rule keeps the whole list as its written text, which write-back
 * writes, and is marked.
 *
 * @param {RuleRecord} record
 * @param {RunContext} context
 * @param {TokenListId} list the id of the folded selector, interned in the run
 * @return {void}
 */
export declare function writeSelectorList(record: RuleRecord, context: RunContext, list: TokenListId): void;
//# sourceMappingURL=selectorEdits.d.ts.map