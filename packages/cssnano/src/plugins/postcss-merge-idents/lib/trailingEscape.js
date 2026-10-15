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
  return codePoint === ' ' ||
    codePoint === '\t' ||
    codePoint === '\n' ||
    codePoint === '\r' ||
    codePoint === '\f'
    ? value + codePoint
    : undefined;
}

export { trailingEscape };
