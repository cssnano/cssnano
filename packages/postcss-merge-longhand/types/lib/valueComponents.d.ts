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
 * @param {boolean} allowCommas
 * @return {{components: Component[], raw: string}[] | null}
 */
export declare function splitValue(value: string, allowCommas: boolean): {
    components: Component[];
    raw: string;
}[] | null;
//# sourceMappingURL=valueComponents.d.ts.map