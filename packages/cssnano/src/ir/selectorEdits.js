/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TokenListId} from './tokenLists.js' */
/** @import {RunContext} from '../run/runContext.js' */

/*
 * The edits of a rule's selector. Only this module writes the ids of a rule.
 */

/**
 * Gives a rule the ids of its selector items and marks it, so write-back
 * writes its selector from them.
 *
 * @param {RuleRecord} record
 * @param {readonly TokenListId[]} ids
 * @return {void}
 */
export function writeSelectorIds(record, ids) {
  const writable =
    /** @type {{selectorIds: readonly TokenListId[], parsedPrefix: number, writtenList: number, marked: boolean}} */ (
      /** @type {unknown} */ (record)
    );
  writable.selectorIds = ids;
  writable.parsedPrefix = 0;
  writable.writtenList = -1;
  writable.marked = true;
}

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
export function writeSelectorList(record, context, list) {
  const { tokenLists, selectorIds } = context;
  writeSelectorIds(
    record,
    selectorIds.idsOfList(tokenLists, tokenLists.get(list))
  );
  /** @type {{writtenList: number}} */ (
    /** @type {unknown} */ (record)
  ).writtenList = list;
}
