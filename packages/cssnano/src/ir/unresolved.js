import { withoutVendorPrefix } from './vendorPrefix.js';
import cssnanoUtils from '#utils';
import { TokenType } from '@csstools/css-tokenizer';

const { asciiLowerCase, decoded, skipTrivia, substitutionFunctions } =
  cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/* A substitution function stands for any component, so the merge lets it fill
 * any slot of a shorthand. Unlike the plugins, it does not count `--name()`
 * custom functions or `inherit()`: a browser without them would drop the whole
 * merged shorthand rather than one longhand. */

/* Math functions that can produce computed lengths (unlike sin(), pow(),
 * sqrt() which produce only numbers). Inside other functions, their type is
 * determined by context. */
const mathFunctions = [
  'calc',
  'min',
  'max',
  'clamp',
  'hypot',
  'round',
  'mod',
  'rem',
  'abs',
  'sign',
];

/* Unresolved functions: the substitution and math functions above. */
const trustedFunctions = substitutionFunctions.union(new Set(mathFunctions));

/* Math functions have a fixed type from their own syntax: calc() produces a
 * length or number, never a keyword or color. Unlike substitutions, they can
 * only fill a component if its grammar accepts that type. */
const trustedSupportFunctions = trustedFunctions.difference(
  substitutionFunctions
);

/**
 * The function name a component opens with, unprefixed. A component with no
 * tokens has no function to name.
 *
 * @param {readonly CSSToken[] | undefined} tokens
 * @param {number} start
 * @param {number} end
 * @return {string|undefined}
 */
function leadingFunctionName(tokens, start, end) {
  if (tokens === undefined) return undefined;
  const index = skipTrivia(tokens, start, end);
  if (index === end) return undefined;
  const token = tokens[index];
  if (token[0] !== TokenType.Function) return undefined;
  return withoutVendorPrefix(asciiLowerCase(decoded(token)));
}

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
function isUnresolved(tokens, start, end) {
  const name = leadingFunctionName(tokens, start, end);

  return name !== undefined && trustedFunctions.has(name);
}

/**
 * @param {string} name - a function name as written, possibly vendor-prefixed
 * @return {boolean} whether the function is one this plugin trusts
 */
function isTrustedFunction(name) {
  return trustedFunctions.has(withoutVendorPrefix(asciiLowerCase(name)));
}

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
function isSubstitution(tokens, start, end) {
  const name = leadingFunctionName(tokens, start, end);

  return name !== undefined && substitutionFunctions.has(name);
}

export {
  isSubstitution,
  isTrustedFunction,
  isUnresolved,
  substitutionFunctions,
  trustedSupportFunctions,
};
