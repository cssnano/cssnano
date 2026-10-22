import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The value as PostCSS parses it. A comment survives only between two tokens
 * that are neither spaces nor the edges of the value, and not after a comma.
 *
 * @param {readonly CSSToken[]} input
 * @return {string}
 */
export declare function parsedValueText(input: readonly CSSToken[]): string;
//# sourceMappingURL=parsedValueText.d.ts.map