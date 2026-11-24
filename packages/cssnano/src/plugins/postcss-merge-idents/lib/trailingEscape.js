import cssnanoUtils from '#utils';
import { COMMENT } from '../../../ir/blockRecord.js';
import { declaredValue, rawAfterValue } from '../../../ir/declaredText.js';

const { endsWithEscapingBackslash, isCSSWhitespace } = cssnanoUtils;

/** @import {ArenaIndex} from '../../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from '../../../ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from '../../../ir/ruleRecord.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */

/**
 * The first code point that PostCSS serializes after the value, which a
 * trailing backslash escapes. PostCSS trims whitespace after a value into
 * `raws.value.raw`, or leaves it to the stringifier, so this mirrors how the
 * stringifier writes the declaration.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @param {string} value the declared value, which ends in a dangling escape
 * @return {string | undefined} `undefined` when it cannot be determined
 */
function codePointAfterValue(records, tokenLists, index, value) {
  const { links } = records;
  const entry = /** @type {DeclarationRecord} */ (records.entry(index));
  const raw = rawAfterValue(tokenLists, entry, value);
  if (raw !== null) {
    return raw === '' ? undefined : raw;
  }
  if (entry.important) {
    return (entry.importantSpelling || ' !important')[0];
  }
  // The stringifier ignores trailing comments when it decides whether the
  // last declaration gets a semicolon.
  const next = links.nextSibling(index);
  let sibling = next;
  while (sibling !== -1 && records.entry(sibling).kind === COMMENT) {
    sibling = links.nextSibling(sibling);
  }
  const container = /** @type {BlockRecord | RuleRecord} */ (
    records.entry(/** @type {ArenaIndex} */ (links.parentOf(index)))
  );
  if (sibling !== -1 || container.semicolon) {
    return ';';
  }
  const before = next === -1 ? undefined : records.entry(next).before;
  return (before ?? container.after)?.[0];
}

/**
 * Restores the whitespace that PostCSS trims from a declaration value ending in
 * a backslash, so the value tokenizes as the browser reads it. A space or tab
 * after the backslash makes an escape; a newline leaves the backslash a delim,
 * which no rename removes.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {string | undefined} the value to tokenize and rewrite, or
 *   `undefined` when the code point after a trailing backslash is unknown
 */
export function trailingEscape(records, tokenLists, index) {
  const value = declaredValue(
    tokenLists,
    /** @type {DeclarationRecord} */ (records.entry(index))
  );
  if (!endsWithEscapingBackslash(value)) {
    return value;
  }
  const codePoint = codePointAfterValue(records, tokenLists, index, value);
  return codePoint !== undefined && isCSSWhitespace(codePoint.charCodeAt(0))
    ? value + codePoint
    : undefined;
}
