import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * @param {import('../lib/tokenize.js').Term[]} gridAutoFlow
 * @return {CSSToken[] | null}
 */
declare const normalizeGridAutoFlow: (gridAutoFlow: import('../lib/tokenize.js').Term[]) => CSSToken[] | null;
/**
 * @param {import('../lib/tokenize.js').Term[]} grid
 * @param {number} [maxLines=2] Maximum number of <grid-line>s the property accepts.
 * @return {CSSToken[] | null}
 */
declare const normalizeGridColumnRow: (grid: import('../lib/tokenize.js').Term[], maxLines?: number) => CSSToken[] | null;
export { normalizeGridAutoFlow, normalizeGridColumnRow };
//# sourceMappingURL=grid.d.ts.map