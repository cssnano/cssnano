import type { Parser, PairFamily } from './pairForms.js';
/** @import {Parser, PairFamily} from './pairForms.js'; */
/**
 * @param {ReadonlySet<string>} keywords - lowercase
 * @return {Parser}
 */
export declare function keywordParser(keywords: ReadonlySet<string>): Parser;
/**
 * The one component of a value, or undefined when a top-level comma, slash or
 * whitespace divides it. Brackets keep their contents together.
 *
 * @param {import('../blockDeclarations.js').DeclarationItem} decl
 * @return {import('../valueComponents.js').Component | undefined}
 */
export declare function singleComponent(decl: import('../blockDeclarations.js').DeclarationItem): import('../valueComponents.js').Component | undefined;
/**
 * The tokens of a value whose top-level components each hold one token, or
 * undefined when a slash, comma or function divides or nests it.
 *
 * @param {import('../blockDeclarations.js').DeclarationItem} decl
 * @return {import('@csstools/css-tokenizer').CSSToken[] | undefined}
 */
export declare function componentTokens(decl: import('../blockDeclarations.js').DeclarationItem): import('@csstools/css-tokenizer').CSSToken[] | undefined;
/**
 * @param {string} shorthand
 * @param {string[]} longhands
 * @param {Omit<PairFamily, 'shorthand' | 'longhands' | 'aliases' | 'supportKey'> & { aliases?: string[], supportKey?: string | null }} rest
 * @return {PairFamily}
 */
export declare function family(shorthand: string, longhands: string[], rest: Omit<PairFamily, 'shorthand' | 'longhands' | 'aliases' | 'supportKey'> & {
    aliases?: string[];
    supportKey?: string | null;
}): PairFamily;
/**
 * A single component of the component's own type. A colour function such as
 * `rgb(0,0,0)` is one component. A substitution has no known type and a math
 * function is not compared, so both are left alone.
 *
 * @param {(text: string, tokens: import('@csstools/css-tokenizer').CSSToken[] | undefined, start: number, end: number) => boolean} is
 * @return {Parser}
 */
export declare function ruleComponent(is: (text: string, tokens: import('@csstools/css-tokenizer').CSSToken[] | undefined, start: number, end: number) => boolean): Parser;
//# sourceMappingURL=pairFamilyBuilders.d.ts.map