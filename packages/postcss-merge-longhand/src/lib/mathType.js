import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import { withoutVendorPrefix } from './vendorPrefix.js';

const { asciiLowerCase, decoded, lengthUnits } = cssnanoUtils;

/** @typedef {'number' | 'length' | 'percentage' | 'length-percentage'} MathType */

/* Math constants of CSS Values 4 are numbers. */
const constants = new Set(['e', 'pi', 'infinity', '-infinity', 'nan']);

/* The arity of each supported function; others fail closed. */
const arities = new Map([
  ['calc', [1, 1]],
  ['abs', [1, 1]],
  ['clamp', [3, 3]],
  ['min', [1, Infinity]],
  ['max', [1, Infinity]],
  ['hypot', [1, Infinity]],
]);

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
 * Types a calculation the way CSS Values 4 does for lengths. Division by a
 * non-number, `round()` and its relatives, and anything else this does not
 * model fail closed, as a user agent that lacks the feature drops them.
 */
class MathParser {
  /** @type {ReturnType<typeof tokenize>} */
  #tokens;
  #index = 0;

  /** @param {string} css */
  constructor(css) {
    this.#tokens = tokenize({ css }).filter(
      (part) => part[0] !== TokenType.Comment && part[0] !== TokenType.EOF
    );
  }

  /** @return {TokenType | -1} the type of the next token, or -1 at the end */
  #peek() {
    return this.#index < this.#tokens.length
      ? this.#tokens[this.#index][0]
      : -1;
  }

  /** @return {boolean} whether whitespace was skipped */
  #skipSpace() {
    const start = this.#index;
    while (this.#peek() === TokenType.Whitespace) this.#index++;
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
    this.#index++;
    return value;
  }

  /** @return {MathType | undefined} the type of the input as one expression */
  parseAll() {
    this.#skipSpace();
    const type = this.#sum();
    this.#skipSpace();
    return this.#index === this.#tokens.length ? type : undefined;
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
    const part = this.#tokens[this.#index];
    if (part === undefined) return undefined;
    this.#index++;
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
        const arity = arities.get(
          withoutVendorPrefix(asciiLowerCase(decoded(part)))
        );
        return arity && this.#arguments(arity[0], arity[1]);
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
      this.#index++;
      if (closing === TokenType.CloseParen) {
        return count >= least ? type : undefined;
      }
      if (closing !== TokenType.Comma) return undefined;
    }
  }
}

/**
 * @param {string} token - a math function or a parenthesized expression
 * @return {MathType | undefined} its type; `undefined` when a user agent
 * rejects the expression or this module cannot tell
 */
export function mathType(token) {
  return new MathParser(token).parseAll();
}
