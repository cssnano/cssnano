import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { withoutVendorPrefix } from '../../ir/vendorPrefix.js';
import {
  isTrustedFunction,
  isUnresolved,
  substitutionFunctions,
} from '../../ir/unresolved.js';
import { closingTokens } from './valueComponents.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { asciiLowerCase, closeForOpening, decoded, lengthUnits } = cssnanoUtils;

/** @typedef {'number' | 'length' | 'percentage' | 'length-percentage'} MathType */

/* Math constants of CSS Values 4 are numbers. */
const constants = new Set(['e', 'pi', 'infinity', '-infinity', 'nan']);

/* The rounding strategies that may lead the arguments of round(). */
const roundingStrategies = new Set(['nearest', 'up', 'down', 'to-zero']);

/**
 * @typedef {object} MathFunction
 * @property {number} least the fewest arguments
 * @property {number} most the most arguments
 * @property {'same' | 'toNumber' | 'numbersOnly'} rule how the result type
 * follows from the arguments: the common type, a number of any type, or a
 * number from numbers only
 * @property {boolean} [strategy] whether a rounding strategy may lead
 */

/* Each supported function; trigonometry needs angles, so it fails closed. */
const functions = new Map(
  /** @type {[string, MathFunction][]} */ ([
    ['calc', { least: 1, most: 1, rule: 'same' }],
    ['abs', { least: 1, most: 1, rule: 'same' }],
    ['clamp', { least: 3, most: 3, rule: 'same' }],
    ['min', { least: 1, most: Infinity, rule: 'same' }],
    ['max', { least: 1, most: Infinity, rule: 'same' }],
    ['hypot', { least: 1, most: Infinity, rule: 'same' }],
    ['mod', { least: 2, most: 2, rule: 'same' }],
    ['rem', { least: 2, most: 2, rule: 'same' }],
    ['round', { least: 1, most: 2, rule: 'same', strategy: true }],
    ['sign', { least: 1, most: 1, rule: 'toNumber' }],
    ['exp', { least: 1, most: 1, rule: 'numbersOnly' }],
    ['sqrt', { least: 1, most: 1, rule: 'numbersOnly' }],
    ['pow', { least: 2, most: 2, rule: 'numbersOnly' }],
    ['log', { least: 1, most: 2, rule: 'numbersOnly' }],
  ])
);

/**
 * @param {MathType | undefined} left
 * @param {MathType | undefined} right
 * @return {MathType | undefined} the type of a sum, which needs operands of
 * one type, where a length and a percentage give a length-percentage
 */
function sumType(left, right) {
  if (left === undefined || right === undefined) return undefined;
  if (left === right) return left;
  if (left === 'number' || right === 'number') return undefined;
  return 'length-percentage';
}

/**
 * @param {MathType | undefined} left
 * @param {MathType | undefined} right
 * @return {MathType | undefined} the type of a product, where one operand
 * must be a number
 */
function productType(left, right) {
  if (left === undefined || right === undefined) return undefined;
  if (right === 'number') return left;
  return left === 'number' ? right : undefined;
}

/**
 * @param {MathFunction['rule']} rule
 * @param {MathType | undefined} type the common type of the arguments
 * @return {MathType | undefined} the type of a function's result
 */
function resultType(rule, type) {
  if (type === undefined || rule === 'same') return type;
  if (rule === 'toNumber') return 'number';
  return type === 'number' ? 'number' : undefined;
}

/**
 * Types a calculation the way CSS Values 4 does for lengths. Division by a
 * non-number, trigonometric functions that need angles, and anything else
 * this does not model fail closed, as a user agent that lacks the feature
 * drops them.
 */
class MathParser {
  /** @type {readonly CSSToken[]} */
  #tokens;
  /** @type {number} the index of the next token that is not a comment */
  #index;
  /** @type {number} the index just past the expression */
  #end;
  /** @type {number} the argument count of the last #arguments call */
  #count = 0;

  /**
   * @param {readonly CSSToken[]} tokens
   * @param {number} start
   * @param {number} end
   */
  constructor(tokens, start, end) {
    this.#tokens = tokens;
    this.#index = start;
    this.#end = end;
    this.#skipComments();
  }

  /** Comments are not part of the math, so the parser steps over them. */
  #skipComments() {
    while (
      this.#index < this.#end &&
      this.#tokens[this.#index][0] === TokenType.Comment
    ) {
      this.#index++;
    }
  }

  #advance() {
    this.#index++;
    this.#skipComments();
  }

  /** @return {TokenType | -1} the type of the next token, or -1 at the end */
  #peek() {
    return this.#index < this.#end ? this.#tokens[this.#index][0] : -1;
  }

  /** @return {boolean} whether whitespace was skipped */
  #skipSpace() {
    const start = this.#index;
    while (this.#peek() === TokenType.Whitespace) this.#advance();
    return this.#index > start;
  }

  /**
   * @param {string} operators
   * @return {string | undefined} the delimiter, consumed, when it is one of
   * `operators`
   */
  #takeDelimiter(operators) {
    if (this.#peek() !== TokenType.Delim) return undefined;
    const value = /** @type {{value: string}} */ (this.#tokens[this.#index][4])
      .value;
    if (!operators.includes(value)) return undefined;
    this.#advance();
    return value;
  }

  /** @return {MathType | undefined} the type of the input as one expression */
  parseAll() {
    this.#skipSpace();
    const type = this.#sum();
    this.#skipSpace();
    return this.#index === this.#end ? type : undefined;
  }

  /** @return {MathType | undefined} */
  #sum() {
    let type = this.#product();
    for (;;) {
      const start = this.#index;
      const spaceBefore = this.#skipSpace();
      if (this.#takeDelimiter('+-') === undefined) {
        this.#index = start;
        return type;
      }
      /* CSS Values 4 needs whitespace on both sides of `+` and `-`. */
      if (!spaceBefore || !this.#skipSpace()) return undefined;
      type = sumType(type, this.#product());
    }
  }

  /** @return {MathType | undefined} */
  #product() {
    let type = this.#factor();
    for (;;) {
      const start = this.#index;
      this.#skipSpace();
      const operator = this.#takeDelimiter('*/');
      if (operator === undefined) {
        this.#index = start;
        return type;
      }
      this.#skipSpace();
      const operand = this.#factor();
      if (operator === '*') {
        type = productType(type, operand);
      } else if (operand !== 'number') {
        type = undefined;
      }
    }
  }

  /** @return {MathType | undefined} */
  #factor() {
    if (this.#index >= this.#end) return undefined;
    const part = this.#tokens[this.#index];
    this.#advance();
    switch (part[0]) {
      case TokenType.Number:
        return 'number';
      case TokenType.Percentage:
        return 'percentage';
      case TokenType.Dimension:
        return lengthUnits.has(
          asciiLowerCase(/** @type {{unit: string}} */ (part[4]).unit)
        )
          ? 'length'
          : undefined;
      case TokenType.Ident:
        return constants.has(asciiLowerCase(decoded(part)))
          ? 'number'
          : undefined;
      case TokenType.OpenParen:
        return this.#arguments(1, 1);
      case TokenType.Function: {
        const fn = functions.get(
          withoutVendorPrefix(asciiLowerCase(decoded(part)))
        );
        if (fn === undefined) return undefined;
        if (fn.strategy) return this.#round();
        return resultType(fn.rule, this.#arguments(fn.least, fn.most));
      }
      default:
        return undefined;
    }
  }

  /**
   * @param {number} least
   * @param {number} most
   * @return {MathType | undefined} the common type of the comma-separated
   * arguments, up to the closing parenthesis
   */
  #arguments(least, most) {
    let count = 0;
    /** @type {MathType | undefined} */
    let type;
    for (;;) {
      this.#skipSpace();
      const argument = this.#sum();
      this.#skipSpace();
      type = count === 0 ? argument : sumType(type, argument);
      count++;
      if (type === undefined || count > most) return undefined;
      const closing = this.#peek();
      this.#advance();
      if (closing === TokenType.CloseParen) {
        this.#count = count;
        return count >= least ? type : undefined;
      }
      if (closing !== TokenType.Comma) return undefined;
    }
  }

  /**
   * Consumes a rounding strategy and its comma when they lead the arguments.
   * Otherwise the index is unchanged.
   *
   * @return {boolean} whether a strategy was consumed
   */
  #takeStrategy() {
    const start = this.#index;
    this.#skipSpace();
    if (
      this.#peek() === TokenType.Ident &&
      roundingStrategies.has(asciiLowerCase(decoded(this.#tokens[this.#index])))
    ) {
      this.#advance();
      this.#skipSpace();
      if (this.#peek() === TokenType.Comma) {
        this.#advance();
        return true;
      }
    }
    this.#index = start;
    return false;
  }

  /**
   * A leading strategy adds no argument: two arguments of one type follow it.
   * Without one, a single argument must be a number, so `round(1px)` fails.
   *
   * @return {MathType | undefined} the type of round()
   */
  #round() {
    if (this.#takeStrategy()) return this.#arguments(2, 2);
    const type = this.#arguments(1, 2);
    return this.#count === 1 && type !== 'number' ? undefined : type;
  }
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start the index of the first token of the expression
 * @param {number} end the index just past its last token
 * @return {MathType | undefined} the type of a math function or a
 * parenthesized expression; `undefined` when a user agent rejects the
 * expression or this module cannot tell
 */
export function mathType(tokens, start, end) {
  return new MathParser(tokens, start, end).parseAll();
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {boolean} whether the range is one function whose closing
 * parenthesis is its last token
 */
function isOneFunction(tokens, start, end) {
  if (end - start < 2 || tokens[start][0] !== TokenType.Function) return false;
  let depth = 0;
  for (let index = start; index < end; index++) {
    const type = tokens[index][0];
    if (closeForOpening(type) !== undefined) depth++;
    else if (closingTokens.has(type) && --depth === 0) return index === end - 1;
  }
  return false;
}

/**
 * Whether a component that opens with a substitution or math function can be
 * a value of one of the given types. A browser ignores a declaration whose
 * math function types as anything else, such as `calc(10%)` for a width, and
 * a substitution function defers the check to computed-value time. Anything
 * this cannot type fails closed.
 *
 * The range must be exactly one function, as `calc(1%) var(--x)` is two
 * components and a substitution in the second must not vouch for the first.
 *
 * @param {readonly CSSToken[] | undefined} tokens
 * @param {number} start
 * @param {number} end
 * @param {readonly MathType[]} accepted the types the property's grammar takes
 * @return {boolean}
 */
export function isFunctionOfType(tokens, start, end, accepted) {
  if (tokens === undefined || !isUnresolved(tokens, start, end)) return false;
  if (!isOneFunction(tokens, start, end)) return false;

  let substituted = false;
  for (let index = start; index < end; index++) {
    const part = tokens[index];
    if (part[0] !== TokenType.Function) continue;
    const name = decoded(part);
    if (!isTrustedFunction(name)) return false;
    substituted ||= substitutionFunctions.has(
      withoutVendorPrefix(asciiLowerCase(name))
    );
  }
  if (substituted) return true;

  const type = mathType(tokens, start, end);
  return type !== undefined && accepted.includes(type);
}
