import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { list } from 'postcss';
import { boxProperties, shorthandSlot } from './decl/boxGroups.js';
import { componentRanges, splitsAsTokens } from './componentRanges.js';
import { isLengthValue, parseDimension } from './lengthGrammar.js';
import { mathType } from './mathType.js';
import { isTrustedFunction, substitutionFunctions } from './unresolved.js';
import { withoutVendorPrefix } from './vendorPrefix.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { asciiLowerCase, decoded, tokenEnd, tokenStart } = cssnanoUtils;

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
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @param {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function keepsFunction(tokens, start, end, grammar) {
  let opened = false;
  let substituted = false;
  for (let index = start; index < end; index++) {
    const part = tokens[index];
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
        break;
      default:
        if (!opened) return false;
    }
  }
  if (!opened) return false;
  if (substituted) return true;

  const type = mathType(tokens, start, end);
  return (
    type === 'length' ||
    (type !== undefined && type !== 'number' && grammar.percentage)
  );
}

/**
 * @param {string} token a component with no function
 * @param {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function plainSideKeeps(token, grammar) {
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
 * @param {string} value the text the tokens spell
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @param {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function rangeKeeps(value, tokens, start, end, grammar) {
  const token = value.slice(
    tokenStart(tokens[start]),
    tokenEnd(tokens[end - 1])
  );
  return token.includes('(')
    ? keepsFunction(tokens, start, end, grammar)
    : plainSideKeeps(token, grammar);
}

/**
 * The string path: `list.space` splits the value, and each component is
 * tokenized on its own.
 *
 * @param {string} value
 * @param {number} most
 * @param {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function stringComponentsKeep(value, most, grammar) {
  const components = list.space(value);
  if (components.length === 0 || components.length > most) return false;
  return components.every((component) => {
    if (!component.includes('(')) return plainSideKeeps(component, grammar);
    const componentTokens = cssnanoUtils.tokens(component);
    return keepsFunction(componentTokens, 0, componentTokens.length, grammar);
  });
}

/**
 * @param {string} prop lower-cased
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens] the tokens `value` spells. A value with
 * no `(` has no function to type, so it needs none; one with a `(` is
 * tokenized when the caller omits them.
 * @return {boolean} whether the browser keeps the declaration; a property
 * outside the box groups is never kept
 */
function boxBrowserKeeps(prop, value, tokens) {
  const property = boxProperties.get(prop);

  if (property === undefined) {
    return false;
  }

  const { family, slot } = property;

  /* A shorthand spreads one value per slot, or fewer; a longhand names its
   * slot and takes exactly the one. */
  const most = slot === shorthandSlot ? family.longhands.length : 1;
  const { grammar } = family.group;

  if (tokens === undefined && !value.includes('(')) {
    return stringComponentsKeep(value, most, grammar);
  }

  const tokenList = tokens ?? cssnanoUtils.tokens(value);
  if (!splitsAsTokens(tokenList)) {
    return stringComponentsKeep(value, most, grammar);
  }

  const ranges = componentRanges(tokenList);
  if (ranges.length === 0 || ranges.length > most * 2) {
    return false;
  }

  for (let index = 0; index < ranges.length; index += 2) {
    if (
      !rangeKeeps(value, tokenList, ranges[index], ranges[index + 1], grammar)
    ) {
      return false;
    }
  }
  return true;
}
export { boxBrowserKeeps };
