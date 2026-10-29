import cssnanoUtils from '#utils';

/** @import {TextTable} from '../../../values/textTable.js' */

const { isCSSWhitespace, tokens } = cssnanoUtils;

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
 * @param {import('postcss').AtRule} atRule
 * @param {TextTable} table
 * @return {readonly import('@csstools/css-tokenizer').CSSToken[]}
 */
function preludeTokens(atRule, table) {
  const between = atRule.raws?.between ?? '';
  const escapesBetween =
    between !== '' &&
    !isNewlineCode(between.charCodeAt(0)) &&
    endsWithDanglingEscape(atRule.params);
  if (escapesBetween) {
    return tokens(atRule.params + between);
  }
  return table.tokens(atRule);
}

/**
 * The first code point that PostCSS serializes after the value, which a
 * trailing backslash escapes. PostCSS trims whitespace after a value into
 * `raws.value.raw`, or leaves it to the stringifier, so this mirrors how the
 * stringifier writes the declaration.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string | undefined} `undefined` when it cannot be determined
 */
function codePointAfterValue(decl) {
  const raw = decl.raws.value;
  if (raw?.value === decl.value) {
    // A comment beside whitespace is missing from `decl.value`, so the raw
    // only lines up with it when it starts with the value.
    if (!raw.raw.startsWith(decl.value)) {
      return undefined;
    }
    if (raw.raw.length > decl.value.length) {
      return raw.raw[decl.value.length];
    }
  }
  if (decl.important) {
    return (decl.raws.important || ' !important')[0];
  }
  // The stringifier ignores trailing comments when it decides whether the
  // last declaration gets a semicolon.
  let sibling = decl.next();
  while (sibling?.type === 'comment') {
    sibling = sibling.next();
  }
  if (sibling || decl.parent?.raws.semicolon) {
    return ';';
  }
  return (decl.next()?.raws.before ?? decl.parent?.raws.after)?.[0];
}

/**
 * Restores the whitespace that PostCSS trims from a declaration value ending in
 * a backslash, so the value tokenizes as the browser reads it. A space or tab
 * after the backslash makes an escape; a newline leaves the backslash a delim,
 * which no rename removes.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string | undefined} the value to tokenize and rewrite, or
 *   `undefined` when the code point after a trailing backslash is unknown
 */
function trailingEscape(decl) {
  const value = decl.value;
  if (!endsWithDanglingEscape(value)) {
    return value;
  }
  const codePoint = codePointAfterValue(decl);
  return codePoint !== undefined && isCSSWhitespace(codePoint.charCodeAt(0))
    ? value + codePoint
    : undefined;
}

export { endsWithDanglingEscape, preludeTokens, trailingEscape };
