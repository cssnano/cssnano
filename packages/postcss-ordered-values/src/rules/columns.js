/**
 * @param {string} value
 * @return {boolean}
 */
/** @param {import('../lib/tokenize.js').Term[]} columns */
export default (columns) => {
  /** @type {string[]} */
  const widths = [];
  /** @type {string[]} */
  const other = [];
  for (const term of columns) {
    if (term.tokens.length === 1) {
      if (term.tokens[0][0] === 'dimension-token') {
        widths.push(term.raw);
      } else {
        other.push(term.raw);
      }
    }
  }

  // only transform if declaration is not invalid or a single value
  if (other.length === 1 && widths.length === 1) {
    return `${widths[0].trimStart()} ${other[0].trimStart()}`;
  }

  return null;
};
