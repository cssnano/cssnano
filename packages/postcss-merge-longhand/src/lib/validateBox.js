import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import { list } from 'postcss';
import { boxProperties, shorthandSlot } from './decl/boxGroups.js';
import { isLengthValue, parseDimension } from './lengthGrammar.js';
import { mathType } from './mathType.js';
import { isTrustedFunction, substitutionFunctions } from './unresolved.js';
import { withoutVendorPrefix } from './vendorPrefix.js';

const { asciiLowerCase, decoded } = cssnanoUtils;

/* CSS user agents ignore box declarations that violate the property's
 * grammar. Each group of box properties has one grammar, which the generated
 * data derives from the specifications: margin and inset take lengths,
 * percentages and auto; padding takes non-negative lengths and percentages;
 * scroll-margin takes lengths only; scroll-padding adds auto to padding. */

/**
 * A browser drops a math function that does not type as a length, such as
 * `calc(1px + 2deg)`, that holds a function it may lack, such as `anchor()`,
 * or whose percentage the property does not take. A substitution function
 * (`var()`) defers the check to computed-value time, so the declaration still
 * overrides. Anything the plugin cannot type fails closed.
 *
 * @param {string} token
 * @param {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function keepsFunction(token, grammar) {
  let opened = false;
  let substituted = false;
  for (const part of tokenize({ css: token })) {
    switch (part[0]) {
      case TokenType.Function: {
        const name = decoded(part);
        if (!isTrustedFunction(name)) return false;
        substituted ||= substitutionFunctions.includes(
          withoutVendorPrefix(asciiLowerCase(name))
        );
        opened = true;
        break;
      }
      case TokenType.Percentage:
        if (!grammar.percentage) return false;
        break;
      case TokenType.Whitespace:
      case TokenType.EOF:
        break;
      default:
        if (!opened) return false;
    }
  }
  if (!opened) return false;
  if (substituted) return true;

  const type = mathType(token);
  return (
    type === 'length' ||
    (type !== undefined && type !== 'number' && grammar.percentage)
  );
}

/**
 * @param {string} token
 * @param {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function specifiesSide(token, grammar) {
  if (token.includes('(')) {
    return keepsFunction(token, grammar);
  }

  const lowered = asciiLowerCase(token);

  if (lowered === 'auto') {
    return grammar.auto;
  }

  const dimension = parseDimension(lowered);

  /* Only zero may go without a unit; `margin: 5` is no length. */
  return (
    dimension !== undefined &&
    isLengthValue(
      dimension.number,
      dimension.unit,
      grammar.percentage,
      !grammar.negative
    )
  );
}

/**
 * @param {string} prop lower-cased
 * @param {string} value
 * @return {boolean} whether the browser keeps the declaration; a property
 * outside the box groups is never kept
 */
function boxBrowserKeeps(prop, value) {
  const property = boxProperties.get(prop);

  if (property === undefined) {
    return false;
  }

  const { family, slot } = property;
  const tokens = list.space(value);

  /* A shorthand spreads one value per slot, or fewer; a longhand names its
   * slot and takes exactly the one. */
  const most = slot === shorthandSlot ? family.longhands.length : 1;

  if (tokens.length === 0 || tokens.length > most) {
    return false;
  }

  return tokens.every((token) => specifiesSide(token, family.group.grammar));
}
export { boxBrowserKeeps };
