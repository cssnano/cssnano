import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
declare const substitutionFunctions: string[];
declare const trustedSupportFunctions: Set<string>;
/**
 * Whether a component is an unresolved value this plugin cannot compute.
 *
 * Only the leading function determines this: var(--x, rgba(0,0,0,.5)) will
 * substitute a user-agent-computed value, so we cannot infer its type from the
 * fallback. Accepting all bracketed tokens instead would allow any function to
 * represent any type—padding-top: url(x) becomes a length, border-top-width:
 * rgb(0 0 0) a width—and user agents ignore both invalid declarations, so
 * merging them produces invalid shorthands.
 *
 * @param {readonly CSSToken[] | undefined} tokens the tokens of the component
 * @param {number} start
 * @param {number} end
 * @return {boolean}
 */
declare function isUnresolved(tokens: readonly CSSToken[] | undefined, start: number, end: number): boolean;
/**
 * @param {string} name - a function name as written, possibly vendor-prefixed
 * @return {boolean} whether the function is one this plugin trusts
 */
declare function isTrustedFunction(name: string): boolean;
/**
 * Whether a component is a substitution function specifically — the one class
 * of trusted function whose type stays unknowable after substitution, so it
 * can fill any border component rather than only the ones its own type
 * matches.
 *
 * @param {readonly CSSToken[] | undefined} tokens the tokens of the component
 * @param {number} start
 * @param {number} end
 * @return {boolean}
 */
declare function isSubstitution(tokens: readonly CSSToken[] | undefined, start: number, end: number): boolean;
export { isSubstitution, isTrustedFunction, isUnresolved, substitutionFunctions, trustedSupportFunctions, };
//# sourceMappingURL=unresolved.d.ts.map