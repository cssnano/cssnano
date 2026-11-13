import { TokenType } from '@csstools/css-tokenizer';
import { RULE } from './blockRecord.js';
import { writeSelectorIds } from './arenaEdits.js';
import { commentProvidesWhitespace } from '../../values/selectorComments.js';
import { tokensText } from '../../values/tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {TokenListId} from './tokenLists.js' */

/**
 * The key of a selector: its tokens without comments, a comment that separates
 * two components kept as one space, trimmed.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {string}
 */
function selectorKey(tokens) {
  let key = '';
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token[0] !== TokenType.Comment) key += token[1];
    else if (commentProvidesWhitespace(tokens, index)) key += ' ';
  }
  return key.trim();
}

/**
 * Removes the duplicate selectors of a rule and sorts the rest by key. The
 * first selector of each key is kept, with the comments of its duplicates
 * after it. The rule is marked only when its ids change.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {boolean} whether the rule's ids changed, which leaves its summaries stale
 */
export function uniqueRuleSelectors(records, context, index) {
  const record = records.entry(index);
  if (record.kind !== RULE) return false;
  const { selectorIds: ids } = record;
  // One selector has nothing to dedupe or sort.
  if (ids.length < 2) return false;

  const { tokenLists } = context;
  /** @type {Map<string, {id: TokenListId, comments: CSSToken[]}>} */
  const kept = new Map();
  for (const id of ids) {
    const tokens = tokenLists.get(id);
    const key = selectorKey(tokens);
    const first = kept.get(key);
    if (first === undefined) {
      kept.set(key, { id, comments: [] });
    } else {
      for (const token of tokens) {
        if (token[0] === TokenType.Comment) first.comments.push(token);
      }
    }
  }

  const sorted = [...kept.entries()].toSorted(([a], [b]) => {
    if (a > b) return 1;
    return a < b ? -1 : 0;
  });
  /** @type {TokenListId[]} */
  const unique = [];
  for (const [, { id, comments }] of sorted) {
    if (comments.length === 0) {
      unique.push(id);
      continue;
    }
    const tokens = [...tokenLists.get(id), ...comments];
    unique.push(
      context.selectorIds.idOf(tokenLists, tokensText(tokens), tokens)
    );
  }

  if (unique.length === ids.length && unique.every((id, i) => id === ids[i])) {
    return false;
  }
  writeSelectorIds(
    /** @type {import('./ruleRecord.js').RuleRecord} */ (record),
    unique
  );
  return true;
}
