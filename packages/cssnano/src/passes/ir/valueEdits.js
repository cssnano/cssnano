import { tokenizeMode } from '../../values/tokenizeMode.js';
import { tokensText } from '../../values/tokensText.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RunContext} from './runContext.js' */

/*
 * The edits of a declaration's value, which a transform writes through the
 * records; write-back writes the value.
 */

/**
 * Writes the value of a declaration in place: its list is interned in the run,
 * and its container's stamp moves so write-back writes it.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index the declaration's index
 * @param {readonly CSSToken[]} list the value's tokens
 * @return {void}
 */
export function writeValue(records, context, index, list) {
  const record = /** @type {DeclarationRecord} */ (records.entry(index));
  const valueList = context.valueIds.idOf(
    context.tokenLists,
    tokenizeMode(record.prop),
    tokensText(list),
    list
  );
  record.valueList = valueList;
  record.rawAfterValue = null;
  record.id = context.declarations.keyOf(
    record.prop,
    valueList,
    record.important,
    record.before
  );
  record.marked = true;
  records.touchDeclarations(records.links.parentOf(index));
}
