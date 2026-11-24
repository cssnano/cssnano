import type { ArenaIndex } from '../../../ir/blockRecord.js';
import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
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
export declare function trailingEscape(records: BlockRecords, tokenLists: TokenLists, index: ArenaIndex): string | undefined;
//# sourceMappingURL=trailingEscape.d.ts.map