export declare const closingTokens: Set<import("@csstools/css-tokenizer").TokenType>;
export type Component = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
};
/**
 * @typedef {{raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}}
 *   Component
 */
/**
 * Split raw CSS into top-level components and comma-separated parts. This is
 * deliberately lexical: property grammar is applied by the caller after
 * brackets and source ranges have been preserved.
 *
 * @param {string} value
 * @param {',' | '/'} [separator] - the top-level token that divides the value
 * into parts; a comma is otherwise a failure, and a slash an ordinary token
 * @return {{components: Component[], raw: string}[] | null}
 */
export declare function splitValue(value: string, separator?: ',' | '/'): {
    components: Component[];
    raw: string;
}[] | null;
//# sourceMappingURL=valueComponents.d.ts.map