import asciiLowerCase from './asciiLowerCase.js';
import { decoded, TokenType } from './value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

// Functions whose value the browser substitutes or types at computed-value time,
// so a value holding one cannot be split or shortened statically. attr() and
// if() are arbitrary substitution functions too, even when attr() names a type.
export const substitutionFunctions = new Set([
  'var',
  'env',
  'constant',
  'attr',
  'if',
]);

// The plugins leave a value alone when it holds any of these. `inherit(` is not
// valid CSS, but it counts so that the value is passed through unchanged.
const unchangedFunctions = substitutionFunctions.union(new Set(['inherit']));

/**
 * Whether a function name is one whose result is substituted at computed-value
 * time. The name must be lowercase ASCII, and a vendor prefix is not stripped.
 *
 * @param {string} name
 * @return {boolean}
 */
export function isSubstitutionFunction(name) {
  return name.startsWith('--') || unchangedFunctions.has(name);
}

/**
 * Whether a token is a function token whose name is a substitution function,
 * compared ASCII-case-insensitively after unescaping.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
export function isSubstitutionToken(token) {
  if (token[0] !== TokenType.Function) return false;
  return isSubstitutionFunction(asciiLowerCase(decoded(token)));
}
