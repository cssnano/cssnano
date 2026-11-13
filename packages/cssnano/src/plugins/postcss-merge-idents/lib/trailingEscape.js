import cssnanoUtils from '#utils';
import { COMMENT } from '../../../passes/ir/blockRecord.js';
import {
  atRuleAt,
  declaredValue,
  preludeListOf,
  preludeTextOf,
} from './declaredText.js';

const { isCSSWhitespace, tokens } = cssnanoUtils;

/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from '../../../passes/ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../../../passes/ir/declarationRecord.js' */
/** @import {RuleRecord} from '../../../passes/ir/ruleRecord.js' */
/** @import {TokenLists} from '../../../passes/ir/tokenLists.js' */

/**
 * @param {string} value
 * @return {boolean} whether the last backslash escapes nothing inside the
 *   value, i.e. the value ends in an odd number of backslashes
 */
function endsWithDanglingEscape(value) {
  let count = 0;
  while (count < value.length && value[value.length - 1 - count] === '\\') {
    count++;
  }
  return count % 2 === 1;
}

/**
 * @param {number} code a UTF-16 code unit
 * @return {boolean} whether it is a CSS newline: LF, CR or FF
 */
function isNewlineCode(code) {
  return code === 0x0a || code === 0x0d || code === 0x0c;
}

/**
 * The tokens of an at-rule's prelude. A dangling backslash escapes the space
 * that PostCSS keeps in `raws.between`, so that space joins the prelude;
 * otherwise the between-block space holds only whitespace and comments, and
 * the stored list of the prelude stands for it.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {readonly import('@csstools/css-tokenizer').CSSToken[]}
 */
export function preludeTokens(records, tokenLists, index) {
  const entry = atRuleAt(records, index);
  const between = entry.between ?? '';
  const params = preludeTextOf(tokenLists, entry);
  const escapesBetween =
    between !== '' &&
    !isNewlineCode(between.charCodeAt(0)) &&
    endsWithDanglingEscape(params);
  if (escapesBetween) {
    return tokens(params + between);
  }
  return preludeListOf(tokenLists, entry);
}

/**
 * The first code point that PostCSS serializes after the value, which a
 * trailing backslash escapes. PostCSS trims whitespace after a value into
 * `raws.value.raw`, or leaves it to the stringifier, so this mirrors how the
 * stringifier writes the declaration.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {string | undefined} `undefined` when it cannot be determined
 */
function codePointAfterValue(records, tokenLists, index) {
  const { links } = records;
  const entry = /** @type {DeclarationRecord} */ (records.entry(index));
  if (entry.rawAfterValue !== null) {
    return entry.rawAfterValue === '' ? undefined : entry.rawAfterValue;
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
  if (!endsWithDanglingEscape(value)) {
    return value;
  }
  const codePoint = codePointAfterValue(records, tokenLists, index);
  return codePoint !== undefined && isCSSWhitespace(codePoint.charCodeAt(0))
    ? value + codePoint
    : undefined;
}
