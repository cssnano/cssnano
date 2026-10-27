export declare const closingTokens: Set<import("@csstools/css-tokenizer").TokenType>;
export type Component = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
    start: number;
    end: number;
};
/**
 * A top-level component: its text, its tokens, and the range of the caller's
 * token list that holds them, `end` exclusive.
 *
 * @typedef {{
 *   raw: string,
 *   tokens: import('@csstools/css-tokenizer').CSSToken[],
 *   start: number,
 *   end: number,
 * }} Component
 */
/**
 * Split raw CSS into top-level components and comma-separated parts. This is
 * deliberately lexical: property grammar is applied by the caller after
 * brackets and source ranges have been preserved.
 *
 * @param {string} value
 * @param {',' | '/'} [separator] - the top-level token that divides the value
 * into parts; a comma is otherwise a failure, and a slash an ordinary token
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [list] the
 * tokens of `value`, when the caller has them from the text table
 * @return {{components: Component[], raw: string}[] | null}
 */
export declare function splitValue(value: string, separator?: ',' | '/', list?: readonly import('@csstools/css-tokenizer').CSSToken[]): {
    components: Component[];
    raw: string;
}[] | null;
//# sourceMappingURL=valueComponents.d.ts.map