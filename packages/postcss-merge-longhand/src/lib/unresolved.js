'use strict';

/* Substitution functions from CSS Values. If a user agent does not support
 * one, the entire declaration becomes invalid, so we cannot infer what value
 * substitutes at runtime. */
const substitutionFunctions = ['var', 'env', 'constant'];

/* Math functions that can produce computed lengths. Unlike sin(), pow(),
 * sqrt() which produce only numbers, these can appear where lengths are
 * needed. Inside other functions, their result type is determined by context. */
const mathFunctions = [
  'calc',
  'min',
  'max',
  'clamp',
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

const vendorPrefix = /^-[a-z]+-/;
const leadingFunction = /^(-?[a-z][\w-]*)\(/i;

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
  const match = leadingFunction.exec(token);

  if (!match) {
    return false;
  }

  const name = match[1].toLowerCase();

  return (
    trustedFunctions.has(name) ||
    trustedFunctions.has(name.replace(vendorPrefix, ''))
  );
}

module.exports = { isUnresolved, substitutionFunctions, trustedFunctions };
