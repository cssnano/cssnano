import cssnanoUtils from '#utils';
import { AT_RULE_BLOCK, RULE } from '../passes/ir/blockRecord.js';
import { writeBefore } from '../passes/ir/rawEdits.js';
import { tokenizeMode } from '../values/tokenizeMode.js';
import { tokensText } from '../values/tokensText.js';

/** @import {ArenaIndex, BlockRecord} from '../passes/ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {RuleRecord} from '../passes/ir/ruleRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */

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
 * The value of a declaration with the character its last backslash escapes.
 * The parser puts that character in the raw after the block when the value
 * ends the block's text, so the escape would otherwise take the closing brace.
 * An important flag follows its value, so the escape there takes the flag's
 * own whitespace. The value is the one the comment removal left, so the
 * character joins what the declaration keeps.
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
  const block = records.entry(
    /** @type {ArenaIndex} */ (links.parentOf(index))
  );
  if (block.kind !== RULE && block.kind !== AT_RULE_BLOCK) return value;
  const { after } = /** @type {RuleRecord | BlockRecord} */ (block);
  if (!after) return value;
  const { prop, important } = /** @type {DeclarationRecord} */ (
    records.entry(index)
  );
  if (important) return value;
  const text = tokensText(run.tokenLists.get(value));
  if (!cssnanoUtils.endsWithEscapingBackslash(text)) return value;
  return run.valueIds.idOf(run.tokenLists, tokenizeMode(prop), text + after[0]);
}
