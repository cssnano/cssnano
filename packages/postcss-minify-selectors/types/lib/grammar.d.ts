/**
 * @typedef {'forgiving-selector-list'
 *   | 'selector-list'
 *   | 'relative-selector-list'
 *   | 'compound-selector'
 *   | 'an-plus-b-of'
 *   | 'an-plus-b'
 *   | 'ident-or-string-list'
 *   | 'ident-list'
 *   | 'ident'
 *   | 'pt-name-selector'
 * } ArgumentGrammar
 */
export type ArgumentGrammar = 'forgiving-selector-list' | 'selector-list' | 'relative-selector-list' | 'compound-selector' | 'an-plus-b-of' | 'an-plus-b' | 'ident-or-string-list' | 'ident-list' | 'ident' | 'pt-name-selector';
export type GrammarEntry = ArgumentGrammar;
/** @typedef {ArgumentGrammar} GrammarEntry */
export declare const legacyPseudoElements: Set<string>;
export declare const pseudoElements: Set<string>;
export declare const functionalPseudoElements: Set<string>;
export declare const operators: Set<string>;
export declare const safePseudos: Set<string>;
/**
 * Registry mapping recognized functional pseudos to their declarative argument grammar.
 * Unknown/framework functions stay opaque and retain their exact source.
 * @type {Map<string, ArgumentGrammar>}
 */
export declare const selectorGrammar: Map<string, ArgumentGrammar>;
//# sourceMappingURL=grammar.d.ts.map