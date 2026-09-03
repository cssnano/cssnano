import { isDimension } from '../lib/tokenize.js';

/** @param {import('../lib/tokenize.js').Term[]} columns */
export default (columns) => {
  /** @type {string[]} */
  const widths = [];
  /** @type {string[]} */
  const other = [];
  for (const term of columns) {
    // Multi-token terms (e.g. functions) cannot be classified safely.
    if (term.tokens.length !== 1) return null;
    if (isDimension(term)) {
      widths.push(term.raw);
    } else {
      other.push(term.raw);
    }
  }

  // only transform if declaration is not invalid or a single value
  if (other.length === 1 && widths.length === 1) {
    return `${widths[0].trimStart()} ${other[0].trimStart()}`;
  }

  return null;
};
