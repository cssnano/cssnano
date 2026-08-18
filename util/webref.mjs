/**
 * Matches a reference to another CSS grammar production.
 */
export const REFERENCE = /<(?:'([^'>]+)'|([^'>\s]+)(?:\s+\[[^\]]*\])?)>/g;

/**
 * Returns the literal keywords a grammar offers. Function calls do not count:
 * their names cannot be written as bare keywords.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export function keywordTerminals(syntax) {
  if (!syntax) {
    return [];
  }

  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const keywords = [];

  for (const match of literals.matchAll(/[a-zA-Z][a-zA-Z0-9-]*/g)) {
    const [keyword] = match;
    const rest = literals.slice(
      /** @type {number} */ (match.index) + keyword.length
    );

    if (!/^\s*\(/.test(rest)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}
