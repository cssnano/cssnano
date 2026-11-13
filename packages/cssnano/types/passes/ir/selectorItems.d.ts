import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * The items of a selector: its tokens split at the comma tokens outside every
 * parenthesis, each item trimmed of whitespace. A comment is one token, so a
 * comma inside it does not split. Empty items are kept, as PostCSS keeps them.
 *
 * @param {readonly CSSToken[]} tokens the selector's tokens, as written
 * @return {string[]}
 */
export declare function selectorItemsOf(tokens: readonly CSSToken[]): string[];
//# sourceMappingURL=selectorItems.d.ts.map