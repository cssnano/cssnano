import { cssWideKeywords } from './spec.js';
import cssnanoUtils from 'cssnano-utils';
import { isLengthValue } from './lengthGrammar.js';
import { closingTokens } from './valueComponents.js';

const {
  TokenType,
  asciiLowerCase,
  closeForOpening,
  decoded,
  mathFunctions,
  numeric,
} = cssnanoUtils;

/* Math functions resolve to a value the grammar can accept positionally, and
 * anchor-size() always resolves to a length. */
const valueFunctions = new Set([...mathFunctions.keys(), 'anchor-size']);
/* These functions have a fixed result type that cannot be a length. They
 * remain in valueFunctions so valid uses nested in calc() are accepted. */
const nonLengthResultFunctions = new Set([
  'acos',
  'asin',
  'atan',
  'atan2',
  'cos',
  'exp',
  'log',
  'pow',
  'sign',
  'sin',
  'sqrt',
  'tan',
]);

/* round() may lead with a <rounding-strategy> keyword, an argument that the
 * math function arity table does not count. */
const roundingStrategies = new Set(['nearest', 'up', 'down', 'to-zero']);

/**
 * firstArgument is 'keyword' only while the first argument of round() is a
 * lone <rounding-strategy>, which the arity table does not count. In a
 * calculation, operand records whether the argument so far ends with a value.
 *
 * @typedef {{name: string | null, expected: import('@csstools/css-tokenizer').TokenType, commas: number, hasValue: boolean, firstArgument: 'empty' | 'keyword' | 'value', calculation: boolean, operand: boolean}} FunctionFrame
 */

/**
 * @typedef {{raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}}
 *   Component
 */

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
 * Check function names recursively. Detailed value grammar belongs to the
 * individual reducer; rejecting unknown and substitution functions here keeps
 * every reducer conservative without losing raw function spelling.
 *
 * @param {Component} component
 * @param {Set<string>} allowed
 * @return {boolean}
 */
export function hasAllowedFunctions(component, allowed) {
  /** @type {FunctionFrame[]} */
  const stack = [];
  for (const token of component.tokens) {
    if (token[0] === TokenType.Function) {
      const name = tokenName(token);
      if (!pushFunctionFrame(stack, name, allowed)) return false;
    } else if (token[0] === TokenType.Whitespace) {
      continue;
    } else if (token[0] === TokenType.Comma) {
      if (!consumeFunctionComma(stack)) return false;
    } else if (closingTokens.has(token[0])) {
      if (!consumeFunctionCloser(stack, token[0])) return false;
    } else {
      const expected = closeForOpening(token[0]);
      if (expected !== undefined) {
        stack.push({
          name: null,
          expected,
          commas: 0,
          hasValue: false,
          firstArgument: 'empty',
          // Parentheses inside a calculation group a nested calculation.
          calculation:
            expected === TokenType.CloseParen &&
            stack.at(-1)?.calculation === true,
          operand: false,
        });
      } else {
        const frame = stack.at(-1);
        if (!frame) return false;
        if (frame.calculation && !consumeCalculationToken(frame, token)) {
          return false;
        }
        const isStrategy =
          frame.name === 'round' &&
          token[0] === TokenType.Ident &&
          roundingStrategies.has(asciiLowerCase(decoded(token)));
        if (!consumeFunctionValue(frame, isStrategy)) return false;
      }
    }
  }
  if (stack.length) return false;
  return operatorsHaveRightOperands(component.tokens);
}

/** @param {FunctionFrame[]} stack @param {string} name @param {Set<string>} allowed @return {boolean} */
function pushFunctionFrame(stack, name, allowed) {
  if (!allowed.has(name)) return false;
  stack.push({
    name,
    expected: TokenType.CloseParen,
    commas: 0,
    hasValue: false,
    firstArgument: 'empty',
    calculation: mathFunctions.has(name),
    operand: false,
  });
  return true;
}

/**
 * A calculation alternates values and operators, starting and ending with a
 * value: CSS math has no unary operators and no implicit juxtaposition.
 *
 * @param {FunctionFrame} frame
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @return {boolean}
 */
function consumeCalculationToken(frame, token) {
  if (token[0] === TokenType.Delim) {
    if (!isMathOperator(token[1]) || !frame.operand) return false;
    frame.operand = false;
    return true;
  }
  if (frame.operand) return false;
  frame.operand = true;
  return true;
}

/** @param {FunctionFrame} frame @param {boolean} isStrategy @return {boolean} */
function consumeFunctionValue(frame, isStrategy) {
  if (frame.commas > 0) {
    // Only the first argument may be a strategy; later ones are not
    // counted, so a repeated keyword would pass the arity check.
    if (isStrategy) return false;
  } else if (frame.firstArgument === 'keyword') {
    // The keyword must stand alone, or the rest of the argument would be
    // counted as a calculation.
    return false;
  } else if (frame.firstArgument === 'empty') {
    frame.firstArgument = isStrategy ? 'keyword' : 'value';
  }
  frame.hasValue = true;
  return true;
}

/** @param {FunctionFrame[]} stack @return {boolean} */
function consumeFunctionComma(stack) {
  const frame = stack.at(-1);
  if (!frame?.name || !frame.hasValue) return false;
  if (frame.calculation && !frame.operand) return false;
  frame.commas++;
  frame.hasValue = false;
  frame.operand = false;
  return true;
}

/** @param {FunctionFrame[]} stack @param {import('@csstools/css-tokenizer').TokenType} type @return {boolean} */
function consumeFunctionCloser(stack, type) {
  const frame = stack.pop();
  if (!frame || frame.expected !== type || !frame.hasValue) return false;
  if (frame.calculation && !frame.operand) return false;
  const argumentCount =
    frame.commas + (frame.firstArgument === 'keyword' ? 0 : 1);
  if (!functionArityIsValid(frame.name, argumentCount)) return false;
  const parent = stack.at(-1);
  if (parent) {
    // A nested value makes a leading keyword part of a larger argument.
    if (parent.commas === 0) {
      if (parent.firstArgument === 'keyword') return false;
      parent.firstArgument = 'value';
    }
    if (parent.calculation) {
      if (parent.operand) return false;
      parent.operand = true;
    }
    parent.hasValue = true;
  }
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
function functionArityIsValid(name, argumentCount) {
  if (!name) return true;
  const range = mathFunctions.get(name);
  if (range) {
    return argumentCount >= range[0] && argumentCount <= range[1];
  }
  if (name === 'anchor-size') return argumentCount === 1 || argumentCount === 2;
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
    if (nonLengthResultFunctions.has(tokenName(component.tokens[0]))) {
      return false;
    }
    return hasAllowedFunctions(component, valueFunctions);
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
