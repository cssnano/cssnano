import cssnanoUtils from 'cssnano-utils';
import { tokenize, TokenType } from '@csstools/css-tokenizer';

const { asciiLowerCase, decoded } = cssnanoUtils;

/* Substitution functions from CSS Values. If a user agent does not support
 * one, the entire declaration becomes invalid, so we cannot infer what value
 * substitutes at runtime. */
const substitutionFunctions = ['var', 'env', 'constant'];

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

/* Unresolved functions: the math functions above, plus attr() and if(),
 * which adopt their context's type requirement. */
const trustedFunctions = new Set([
  ...substitutionFunctions,
  ...mathFunctions,
  'attr',
  'if',
]);

/* Math functions, attr(), and if() have a fixed type from their own syntax
 * or context—calc() produces a length or number, never a keyword or color.
 * Unlike substitutions, they can only fill a component if its grammar accepts
 * that type. */
const trustedSupportFunctions = trustedFunctions.difference(
  new Set(substitutionFunctions)
);

const vendorPrefix = /^-[a-z]+-/v;

/**
 * @param {string} token
 * @return {string|undefined} the function name a token opens with, unprefixed
 */
function leadingFunctionName(token) {
  if (!token.includes('(')) return undefined;
  let firstToken;
  for (const candidate of tokenize({ css: token })) {
    if (
      candidate[0] !== TokenType.Whitespace &&
      candidate[0] !== TokenType.Comment &&
      candidate[0] !== TokenType.EOF
    ) {
      firstToken = candidate;
      break;
    }
  }
  if (!firstToken || firstToken[0] !== TokenType.Function) return undefined;

  return asciiLowerCase(decoded(firstToken)).replace(vendorPrefix, '');
}

/**
 * Whether a token represents an unresolved value this plugin cannot compute.
 *
 * Only the leading function determines this: var(--x, rgba(0,0,0,.5)) will
 * substitute a user-agent-computed value, so we cannot infer its type from the
 * fallback. Accepting all bracketed tokens instead would allow any function to
 * represent any type—padding-top: url(x) becomes a length, border-top-width:
 * rgb(0 0 0) a width—and user agents ignore both invalid declarations, so
 * merging them produces invalid shorthands.
 *
 * @param {string} token
 * @return {boolean}
 */
function isUnresolved(token) {
  const name = leadingFunctionName(token);

  return name !== undefined && trustedFunctions.has(name);
}

/**
 * Whether a token is a substitution function specifically — the one class of
 * trusted function whose type stays unknowable after substitution, so it can
 * fill any border component rather than only the ones its own type matches.
 *
 * @param {string} token
 * @return {boolean}
 */
function isSubstitution(token) {
  const name = leadingFunctionName(token);

  return name !== undefined && substitutionFunctions.includes(name);
}

export {
  isSubstitution,
  isUnresolved,
  substitutionFunctions,
  trustedSupportFunctions,
};
