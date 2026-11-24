import { cssWideKeywords } from '../../ir/spec.js';
import cssnanoUtils from '#utils';
import { isLengthValue } from './lengthGrammar.js';
import { mathType } from './mathType.js';
import { closingTokens } from './valueComponents.js';

const { TokenType, asciiLowerCase, closeForOpening, decoded, numeric } =
  cssnanoUtils;

/**
 * name is null for a bare parenthesized group. Math is typed by mathType, so a
 * frame needs no calculation state.
 *
 * @typedef {{name: string | null, expected: import('@csstools/css-tokenizer').TokenType, commas: number, hasValue: boolean}} FunctionFrame
 */

/** @import {Component} from './valueComponents.js' */

/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {string} */
export function tokenName(token) {
  return asciiLowerCase(decoded(token));
}

/** @param {Component} component @return {string} */
export function componentName(component) {
  const token = component.tokens[0];
  if (!token) return '';
  return token[0] === TokenType.Ident || token[0] === TokenType.Function
    ? tokenName(token)
    : '';
}

/**
 * Return a semantic comparison key without reserializing the component. Raw
 * source is still used for output; decoding is only for classification and
 * equality of case-insensitive CSS tokens.
 *
 * @param {Component} component
 * @return {string}
 */
export function componentKey(component) {
  return component.tokens
    .map((token) => {
      const value = numeric(token);
      if (value) {
        return `numeric:${token[0]}:${value.number}:${asciiLowerCase(value.unit)}`;
      }
      if (token[0] === TokenType.Whitespace) return 'whitespace';
      if (token[0] === TokenType.Ident || token[0] === TokenType.Function) {
        return `${token[0]}:${tokenName(token)}`;
      }
      return `${token[0]}:${token[1]}`;
    })
    .join('|');
}

/** @param {Component} component @return {boolean} */
export function hasCssWideKeyword(component) {
  return component.tokens.some(
    (token) =>
      token[0] === TokenType.Ident && cssWideKeywords.has(tokenName(token))
  );
}

/**
 * Checks the nesting, commas and argument counts of a timing function such as
 * `cubic-bezier(0, 0, 1, 1)`. Only the names in `timingFunctions` may open a
 * function. The grammar does not check the argument values.
 *
 * @param {Component} component
 * @param {Set<string>} timingFunctions
 * @return {boolean}
 */
export function hasTimingFunctionArguments(component, timingFunctions) {
  /** @type {FunctionFrame[]} */
  const stack = [];
  for (const token of component.tokens) {
    if (token[0] === TokenType.Function) {
      const name = tokenName(token);
      if (!timingFunctions.has(name)) return false;
      stack.push({
        name,
        expected: TokenType.CloseParen,
        commas: 0,
        hasValue: false,
      });
    } else if (token[0] === TokenType.Whitespace) {
      continue;
    } else if (token[0] === TokenType.Comma) {
      if (!consumeFunctionComma(stack)) return false;
    } else if (closingTokens.has(token[0])) {
      if (!consumeFunctionCloser(stack, token[0])) return false;
    } else {
      const expected = closeForOpening(token[0]);
      if (expected !== undefined) {
        stack.push({ name: null, expected, commas: 0, hasValue: false });
      } else {
        const frame = stack.at(-1);
        if (!frame) return false;
        frame.hasValue = true;
      }
    }
  }
  if (stack.length) return false;
  return operatorsHaveRightOperands(component.tokens);
}

/** @param {FunctionFrame[]} stack @return {boolean} */
function consumeFunctionComma(stack) {
  const frame = stack.at(-1);
  if (!frame?.name || !frame.hasValue) return false;
  frame.commas++;
  frame.hasValue = false;
  return true;
}

/** @param {FunctionFrame[]} stack @param {import('@csstools/css-tokenizer').TokenType} type @return {boolean} */
function consumeFunctionCloser(stack, type) {
  const frame = stack.pop();
  if (!frame || frame.expected !== type || !frame.hasValue) return false;
  if (!timingArityIsValid(frame.name, frame.commas + 1)) return false;
  const parent = stack.at(-1);
  if (parent) parent.hasValue = true;
  return true;
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @return {boolean} */
function operatorsHaveRightOperands(input) {
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (
      token[0] === TokenType.Delim &&
      isMathOperator(token[1]) &&
      operatorHasNoOperand(input, index)
    ) {
      return false;
    }
  }
  return true;
}

/** @param {string} value @return {boolean} */
function isMathOperator(value) {
  return ['+', '-', '*', '/'].includes(value);
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @param {number} index @return {boolean} */
function operatorHasNoOperand(input, index) {
  let next = index + 1;
  while (input[next]?.[0] === TokenType.Whitespace) next++;
  return !input[next] || closingTokens.has(input[next][0]);
}

/** @param {string | null} name @param {number} argumentCount @return {boolean} */
function timingArityIsValid(name, argumentCount) {
  if (!name) return true;
  if (name === 'cubic-bezier') return argumentCount === 4;
  if (name === 'steps') return argumentCount === 1 || argumentCount === 2;
  if (name === 'linear') return argumentCount > 0;
  return false;
}

/** @param {Component} component @return {{number: number, unit: string} | false} */
export function directNumeric(component) {
  if (component.tokens.length !== 1) return false;
  return numeric(component.tokens[0]);
}

/**
 * @param {Component} component
 * @param {{percentage: boolean, auto: boolean, nonNegative?: boolean}}
 *   grammar
 * @return {boolean}
 */
export function isLengthComponent(component, grammar) {
  if (hasCssWideKeyword(component)) return false;
  if (component.tokens[0]?.[0] === TokenType.Function) {
    // mathType rejects an unknown or substitution function, which fails closed.
    const type = mathType(component.tokens, 0, component.tokens.length);
    return (
      type === 'length' ||
      (grammar.percentage &&
        (type === 'percentage' || type === 'length-percentage'))
    );
  }
  const value = directNumeric(component);
  if (value) {
    return isLengthValue(
      value.number,
      value.unit,
      grammar.percentage,
      grammar.nonNegative === true
    );
  }
  return (
    grammar.auto &&
    component.tokens.length === 1 &&
    component.tokens[0][0] === TokenType.Ident &&
    tokenName(component.tokens[0]) === 'auto'
  );
}
