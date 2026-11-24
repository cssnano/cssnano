import cssnanoUtils from '#utils';
import { AT_RULE_BLOCK, RULE } from '../ir/blockRecord.js';
import { writeAfter, writeBefore } from '../ir/rawEdits.js';
import { tokenizeMode } from '../values/tokenizeMode.js';
import { tokensText } from '../values/tokensText.js';

/** @import {ArenaIndex, BlockRecord} from '../ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../ir/declarationRecord.js' */
/** @import {RuleRecord} from '../ir/ruleRecord.js' */
/** @import {TokenListId} from '../ir/tokenLists.js' */
/** @import {BlockRecords} from '../ir/blockRecords.js' */
/** @import {RunContext} from './runContext.js' */

/**
 * Removes the stray semicolons that the raw whitespace before a declaration
 * keeps, as `a{color:red;;_color:blue}` does. A declaration that opens its
 * container, or follows a rule, keeps its raw, since the parser gives no
 * semicolon there that the output needs to drop.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index a declaration
 */
export function stripStrayRawSemicolon(records, index) {
  const { before } = records.entry(index);
  if (before === null || !before.includes(';')) return;
  const prev = records.links.prevSibling(index);
  if (prev !== -1 && records.entry(prev).kind !== RULE) {
    writeBefore(records, index, before.replaceAll(';', ''));
  }
}

/**
 * The value of a declaration with the character after its last backslash. When
 * the value ends the block's text, the parser leaves that character in the
 * block's after raw. It moves into the value, so a merge that moves or appends
 * a declaration cannot let the backslash take the `;` or `}`. The character
 * stays out of an important declaration, whose flag follows its value.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index a declaration
 * @param {TokenListId} value the id of the declaration's value, without the comments that go
 * @returns {TokenListId} the id of the value with the character, or `value` when no escape is open
 */
export function withBlockEscape(records, run, index, value) {
  const { links } = records;
  if (links.nextSibling(index) !== -1) return value;
  const parent = /** @type {ArenaIndex} */ (links.parentOf(index));
  const block = records.entry(parent);
  if (block.kind !== RULE && block.kind !== AT_RULE_BLOCK) return value;
  const { after } = /** @type {RuleRecord | BlockRecord} */ (block);
  if (!after) return value;
  const { prop, important } = /** @type {DeclarationRecord} */ (
    records.entry(index)
  );
  if (important) return value;
  const text = tokensText(run.tokenLists.get(value));
  if (!cssnanoUtils.endsWithEscapingBackslash(text)) return value;
  writeAfter(records, parent, after.slice(1));
  return run.valueIds.idOf(run.tokenLists, tokenizeMode(prop), text + after[0]);
}

/**
 * The folded value with the character its final backslash had before the fold.
 * A stage may trim the newline that makes the backslash an invalid escape, and
 * the backslash would then escape the `;` or `}` after it.
 *
 * @param {RunContext} run
 * @param {string} prop the declaration's property
 * @param {TokenListId} escaped the value with the character `withBlockEscape` gave it
 * @param {TokenListId} folded the value the stages folded `escaped` to
 * @returns {TokenListId} the id of the folded value with the character, or `folded` when it keeps one
 */
export function withEscapeKept(run, prop, escaped, folded) {
  const text = tokensText(run.tokenLists.get(folded));
  if (!cssnanoUtils.endsWithEscapingBackslash(text)) return folded;
  const before = tokensText(run.tokenLists.get(escaped));
  return run.valueIds.idOf(
    run.tokenLists,
    tokenizeMode(prop),
    text + before[before.length - 1]
  );
}
