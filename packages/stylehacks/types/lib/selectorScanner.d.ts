export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type SelectorHack = 'star-html' | 'html-first-child' | 'html-comment-body' | 'body-empty';
export type SelectorHackResults = Record<SelectorHack, string[]>;
/**
 * Tokenize selectors and split them at balanced, top-level commas. The
 * scanner deliberately has no selector grammar: the four legacy tuple
 * layouts below are the only grammar it knows about.
 *
 * @param {string} source
 * @param {SelectorHack} hack
 * @return {string[]}
 */
export declare function findSelectorHacks(source: string, hack: SelectorHack): string[];
/**
 * Get selector hacks for a PostCSS rule. The parsed selector and raw selector
 * are cached independently because the comment-body detector intentionally
 * reads the raw selector source.
 *
 * @param {import('postcss').Rule} rule
 * @return {{selector: SelectorHackResults, raw: SelectorHackResults | undefined}}
 */
export declare function findRuleSelectorHacks(rule: import('postcss').Rule): {
    selector: SelectorHackResults;
    raw: SelectorHackResults | undefined;
};
//# sourceMappingURL=selectorScanner.d.ts.map