import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
export declare const substitutionFunctions: Set<string>;
/**
 * Whether a function name is one whose result is substituted at computed-value
 * time. The name must be lowercase ASCII, and a vendor prefix is not stripped.
 *
 * @param {string} name
 * @return {boolean}
 */
export declare function isSubstitutionFunction(name: string): boolean;
/**
 * Whether a token is a function token whose name is a substitution function,
 * compared ASCII-case-insensitively after unescaping.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
export declare function isSubstitutionToken(token: CSSToken): boolean;
//# sourceMappingURL=substitution.d.ts.map