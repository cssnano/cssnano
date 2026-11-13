import cssnanoUtils from '#utils';
import { DECLARATION, RULE } from '../passes/ir/blockRecord.js';
import { writeBefore } from '../passes/ir/rawEdits.js';
import { declaredValue } from '../passes/ir/declaredText.js';
import { writeValueList } from '../passes/ir/valueEdits.js';
import { tokenizeMode } from '../values/tokenizeMode.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
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
 * Gives the escaped character of a block back to its last declaration. The
 * parser puts that character in the raw after the block when the last
 * declaration has no semicolon, so the escape would otherwise be left dangling.
 * The declaration's value becomes its cleaned value with the character, which
 * is what the node form did, so the comments the value held are dropped too.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index a rule or an at-rule with a block, before its children are visited
 */
export function reattachBlockEscape(records, run, index) {
  const { after } =
    /** @type {import('../passes/ir/ruleRecord.js').RuleRecord} */ (
      records.entry(index)
    );
  if (!after) return;
  const last = records.links.lastChild(index);
  if (last === -1 || records.entry(last).kind !== DECLARATION) return;
  const declaration =
    /** @type {import('../passes/ir/declarationRecord.js').DeclarationRecord} */ (
      records.entry(last)
    );
  const value = declaredValue(run.tokenLists, declaration);
  if (!cssnanoUtils.endsWithEscapingBackslash(value)) return;
  writeValueList(
    records,
    run,
    last,
    run.valueIds.idOf(
      run.tokenLists,
      tokenizeMode(declaration.prop),
      value + after[0]
    )
  );
}
