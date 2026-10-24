import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * A unicode-range token for the code points from `start` to `end`, written
 * as a wildcard range when it covers a power-of-16 block, else as one code
 * point or a span.
 *
 * @param {number} start
 * @param {number} end
 * @param {'u' | 'U'} prefix
 * @return {CSSToken}
 */
declare function unicodeRange(start: number, end: number, prefix?: 'u' | 'U'): CSSToken;
export { unicodeRange };
//# sourceMappingURL=unicodeRange.d.ts.map