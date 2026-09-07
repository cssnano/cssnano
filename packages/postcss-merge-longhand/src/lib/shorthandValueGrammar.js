import cssnanoUtils from 'cssnano-utils';
import cssGlobalKeywords from './cssGlobalKeywords.js';

const { TokenType, decoded, lengthUnits, numeric } = cssnanoUtils;

const openingTokens = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

const substitutionFunctions = new Set(['var', 'env', 'constant', 'attr']);
const valueFunctions = new Set([
  'calc',
  'min',
  'max',
  'clamp',
  'round',
  'mod',
  'rem',
  'abs',
  'sign',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  'anchor-size',
]);

/** @typedef {{name: string | null, expected: import('@csstools/css-tokenizer').TokenType, commas: number, hasValue: boolean}} FunctionFrame */

/**
 * @typedef {{raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}}
 *   Component
 */

/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {string} */
export function tokenName(token) {
  return decoded(token).toLowerCase();
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
        return `numeric:${token[0]}:${value.number}:${value.unit.toLowerCase()}`;
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
      token[0] === TokenType.Ident && cssGlobalKeywords.has(tokenName(token))
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
    } else if (openingTokens.has(token[0])) {
      if (!pushBlockFrame(stack, token[0])) return false;
    } else if (token[0] === TokenType.Whitespace) {
      continue;
    } else if (token[0] === TokenType.Comma) {
      if (!consumeFunctionComma(stack)) return false;
    } else if (closingTokens.has(token[0])) {
      if (!consumeFunctionCloser(stack, token[0])) return false;
    } else {
      const frame = stack.at(-1);
      if (!frame) return false;
      frame.hasValue = true;
    }
  }
  if (stack.length) return false;
  return hasValidFunctionSyntax(component.tokens);
}

/** @param {FunctionFrame[]} stack @param {string} name @param {Set<string>} allowed @return {boolean} */
function pushFunctionFrame(stack, name, allowed) {
  if (substitutionFunctions.has(name) || !allowed.has(name)) return false;
  stack.push({
    name,
    expected: TokenType.CloseParen,
    commas: 0,
    hasValue: false,
  });
  return true;
}

/** @param {FunctionFrame[]} stack @param {import('@csstools/css-tokenizer').TokenType} type @return {boolean} */
function pushBlockFrame(stack, type) {
  const expected = openingTokens.get(type);
  if (expected === undefined) return false;
  stack.push({ name: null, expected, commas: 0, hasValue: false });
  return true;
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
  if (!functionArityIsValid(frame.name, frame.commas + 1)) return false;
  const parent = stack.at(-1);
  if (parent) parent.hasValue = true;
  return true;
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @return {boolean} */
function hasValidFunctionSyntax(input) {
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (token[0] === TokenType.Delim && isMathOperator(token[1])) {
      if (operatorHasNoOperand(input, index)) return false;
    } else if (
      token[0] === TokenType.Comma &&
      commaHasNoOperand(input, index)
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

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @param {number} index @return {boolean} */
function commaHasNoOperand(input, index) {
  let previous = index - 1;
  let next = index + 1;
  while (input[previous]?.[0] === TokenType.Whitespace) previous--;
  while (input[next]?.[0] === TokenType.Whitespace) next++;
  return (
    previous < 0 ||
    next >= input.length ||
    input[previous][0] === TokenType.Comma ||
    input[next][0] === TokenType.Comma ||
    closingTokens.has(input[next][0])
  );
}

/** @param {string | null} name @param {number} argumentCount @return {boolean} */
function functionArityIsValid(name, argumentCount) {
  if (!name) return true;
  if (name === 'calc') return argumentCount === 1;
  if (name === 'clamp') return argumentCount === 3;
  if (name === 'min' || name === 'max' || name === 'hypot') {
    return argumentCount > 0;
  }
  if (name === 'round') return argumentCount === 1 || argumentCount === 2;
  if (name === 'mod' || name === 'rem' || name === 'atan2' || name === 'pow') {
    return argumentCount === 2;
  }
  if (
    [
      'abs',
      'sign',
      'sin',
      'cos',
      'tan',
      'asin',
      'acos',
      'atan',
      'sqrt',
      'log',
      'exp',
    ].includes(name)
  ) {
    return argumentCount === 1;
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
    return hasAllowedFunctions(component, valueFunctions);
  }
  const value = directNumeric(component);
  if (value) {
    if (value.unit === '') {
      return value.number === 0;
    }
    if (value.unit === '%') {
      return grammar.percentage && (!grammar.nonNegative || value.number >= 0);
    }
    return (
      lengthUnits.has(value.unit.toLowerCase()) &&
      (!grammar.nonNegative || value.number >= 0)
    );
  }
  return (
    grammar.auto &&
    component.tokens.length === 1 &&
    component.tokens[0][0] === TokenType.Ident &&
    tokenName(component.tokens[0]) === 'auto'
  );
}
