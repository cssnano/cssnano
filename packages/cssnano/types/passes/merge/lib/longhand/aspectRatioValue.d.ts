import type { CSSToken } from '@csstools/css-tokenizer';
import type { Spelled } from './spelledText.js';
/**
 * Reduces `<number> / 1`, with an optional leading `auto`, to its number.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} list the tokens of `value`
 * @return {Spelled | null}
 */
export declare function reduceAspectRatio(value: string, list: readonly CSSToken[]): Spelled | null;
//# sourceMappingURL=aspectRatioValue.d.ts.map