declare const tokens: typeof import("../../../utils/value.js").tokens;
import type { ValueBuffer } from '../../../values/valueBuffer.js';
export type CSSToken = ReturnType<typeof tokens>[number];
/**
 * A custom property with a `U+` range may be read as `unicode-range` or as
 * anything else, and `u+1.0e2` is a range then a number in one, a single
 * number in the other, so no edit is safe for both. Before an edit the source
 * text is checked; after one, the tokens are, so the text is serialized only
 * when they may hold a range.
 *
 * @param {ValueBuffer} buffer
 * @return {boolean}
 */
export declare function containsUnicodeRange(buffer: ValueBuffer): boolean;
export {};
//# sourceMappingURL=unicodeRange.d.ts.map