import { list } from 'postcss';
import cssnanoUtils from '#utils';

const { TokenType, tokenEnd, tokenStart } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * A top-level component of a value: the text it spells, and the range of the
 * value's tokens that spell it when the value has a token list. The tokens are
 * undefined for a component with no `(`, which has no function to type.
 *
 * @typedef {{
 *   text: string,
 *   tokens: readonly CSSToken[] | undefined,
 *   start: number,
 *   end: number,
 * }} ValueComponent
 */

/**
 * The token ranges that `list.space` splits a value into: whitespace outside
 * parentheses separates components, and a `)` never opens a negative depth.
 * Tokens split where the string does except on a comment or a bad token.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {number[]} the start and end token index of each component,
 * flattened
 */
export function componentRanges(tokens) {
  const ranges = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < tokens.length; index++) {
    const type = tokens[index][0];
    if (depth === 0 && type === TokenType.Whitespace) {
      if (index > start) ranges.push(start, index);
      start = index + 1;
    } else if (type === TokenType.Function || type === TokenType.OpenParen) {
      depth++;
    } else if (type === TokenType.CloseParen && depth > 0) {
      depth--;
    }
  }
  if (tokens.length > start) ranges.push(start, tokens.length);
  return ranges;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @return {boolean} whether the tokens split where `list.space` splits the
 * string; a comment or a bad token makes it split inside a word
 */
export function splitsAsTokens(tokens) {
  for (const part of tokens) {
    switch (part[0]) {
      case TokenType.Comment:
      case TokenType.BadString:
      case TokenType.BadURL:
        return false;
    }
  }
  return true;
}

/**
 * The tokens a value spells: the list the caller has, or one tokenization of a
 * value with a `(`. A value without one has no function, so it needs none.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens]
 * @return {readonly CSSToken[] | undefined}
 */
export function valueTokens(value, tokens) {
  return (
    tokens ?? (value.includes('(') ? cssnanoUtils.tokens(value) : undefined)
  );
}

/**
 * The top-level components of a value, split where `list.space` splits it.
 * A value with a `(` is tokenized once when the caller has no list for it; a
 * value without one has no function to type and needs none.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens] the tokens `value` spells
 * @return {ValueComponent[]}
 */
export function splitComponents(value, tokens) {
  const spelled = valueTokens(value, tokens);
  if (spelled !== undefined && splitsAsTokens(spelled)) {
    const ranges = componentRanges(spelled);
    /** @type {ValueComponent[]} */
    const components = [];
    for (let index = 0; index < ranges.length; index += 2) {
      const start = ranges[index];
      const end = ranges[index + 1];
      components.push({
        text: value.slice(
          tokenStart(spelled[start]),
          tokenEnd(spelled[end - 1])
        ),
        tokens: spelled,
        start,
        end,
      });
    }
    return components;
  }
  return list.space(value).map(wholeText);
}

/**
 * The tokens a declaration's value has in the text table, when the value has a
 * `(` to type; a value without one needs none.
 *
 * @param {import('../../../../values/textTable.js').TextTable} textTable
 * @param {import('postcss').Declaration} decl
 * @return {readonly CSSToken[] | undefined}
 */
export function declarationTokens(textTable, decl) {
  return decl.value.includes('(') ? textTable.tokens(decl) : undefined;
}

/**
 * A text as one component over its own tokens, which are read only when the
 * text has a `(`.
 *
 * @param {string} text
 * @return {ValueComponent}
 */
export function wholeText(text) {
  const tokens = text.includes('(') ? cssnanoUtils.tokens(text) : undefined;
  return { text, tokens, start: 0, end: tokens?.length ?? 0 };
}
