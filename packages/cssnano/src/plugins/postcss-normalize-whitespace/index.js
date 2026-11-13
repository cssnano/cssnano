import cssnanoUtils from '#utils';
import { TokenType } from '@csstools/css-tokenizer';
import {
  endsWithHack,
  isSeparatedByDelimiter,
  replaceToken,
  respelled,
  startsWithHack,
  unhack,
} from './lib/ieHack.js';
import { stringToken } from '../../values/tokenConstructors.js';
import { whitespace } from '../../values/punctuationTokens.js';
import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { normalizeRecordRaws } from '../../passes/ir/normalizeRaws.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from '../../values/valueBuffer.js' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const { asciiLowerCase, decoded, endsWithEscapingBackslash, mathFunctions } =
  cssnanoUtils;

const gridRowsPropertyRegex = /^(?:grid|grid-template|grid-template-areas)$/iv;
const variableFunctions = new Set(['var', 'env', 'constant']);
const hasWhitespaceRegex = /[ \t\n\r\f]/v;

/** @param {import('@csstools/css-tokenizer').TokenType} type */
function isOpeningToken(type) {
  return (
    type === TokenType.OpenParen ||
    type === TokenType.OpenSquare ||
    type === TokenType.OpenCurly
  );
}

/** @param {import('@csstools/css-tokenizer').TokenType} type */
function isClosingToken(type) {
  return (
    type === TokenType.CloseParen ||
    type === TokenType.CloseSquare ||
    type === TokenType.CloseCurly
  );
}

/** @param {import('@csstools/css-tokenizer').CSSToken | undefined} token */
function isComma(token) {
  return token?.[0] === TokenType.Comma;
}

/** @param {import('@csstools/css-tokenizer').CSSToken | undefined} token */
function isSlash(token) {
  return token?.[0] === TokenType.Delim && token[1] === '/';
}

/** @param {import('@csstools/css-tokenizer').CSSToken | undefined} previous @param {import('@csstools/css-tokenizer').CSSToken | undefined} next */
function removesWhitespace(previous, next) {
  return (
    previous?.[0] === TokenType.Function ||
    previous?.[0] === TokenType.OpenParen ||
    next?.[0] === TokenType.CloseParen
  );
}

/**
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens
 * @param {number} index
 * @param {{ math?: boolean, variable?: boolean }[]} stack
 * @return {string}
 */
function whitespaceReplacement(tokens, index, stack) {
  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  const context = stack[stack.length - 1];
  if (previous && endsWithEscapingBackslash(previous[1]))
    return tokens[index][1];
  const besideFunctionBoundary = removesWhitespace(previous, next);
  const besideComma = isComma(previous) || isComma(next);
  const besideSlash = !context?.math && (isSlash(previous) || isSlash(next));
  const variableTrailingFallback =
    context?.variable &&
    previous?.[0] === TokenType.Comma &&
    next?.[0] === TokenType.CloseParen;
  const isBoundary = !previous || !next;
  return !variableTrailingFallback &&
    (isBoundary || besideFunctionBoundary || besideComma || besideSlash)
    ? ''
    : ' ';
}

/**
 * Trim and collapse the spaces and tabs between the names of one grid row.
 * Rows with a backslash are kept as authored, because the whitespace after an
 * escape may belong to the escape or to the name. An unclosed string or a
 * whitespace-only row is also kept.
 * @param {string} raw
 * @return {string}
 */
function trimGridRow(raw) {
  const quote = raw[0];
  if (raw.length < 2 || raw[raw.length - 1] !== quote || raw.includes('\\')) {
    return raw;
  }
  const names = raw
    .slice(1, -1)
    .split(/[ \t]+/v)
    .filter(Boolean);
  if (!names.length) return raw;
  return quote + names.join(' ') + quote;
}

/**
 * The edit of one whitespace token, or undefined when it stays as it is. A
 * run before a `\9` belongs to the hack, which drops it. A run after a `\9`
 * that a delimiter follows is dropped too.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {{ math?: boolean, variable?: boolean }[]} stack
 * @return {TokenEdit | undefined}
 */
function whitespaceEdit(tokens, index, stack) {
  const token = tokens[index];
  if (startsWithHack(tokens[index + 1])) return replaceToken(index, []);
  const previous = tokens[index - 1];
  if (
    previous &&
    endsWithHack(previous) &&
    isSeparatedByDelimiter(tokens[index + 1]?.[1][0] ?? '')
  ) {
    return replaceToken(index, []);
  }
  const replacement = whitespaceReplacement(tokens, index, stack);
  if (replacement === token[1]) return undefined;
  if (replacement === '') return replaceToken(index, []);
  return replaceToken(index, [
    replacement === ' ' ? whitespace() : respelled(token, replacement),
  ]);
}

/**
 * The token edits that trim and collapse the whitespace of a value, and
 * unhack each IE hack outside strings. The stack mirrors the legacy walk:
 * math descendants receive special delimiter treatment, while variable
 * functions trim whitespace around the name and comma delimiters.
 *
 * @param {readonly CSSToken[]} tokens the tokens of the value, without EOF
 * @param {boolean} trimRows whether top-level strings are grid area rows
 * @return {TokenEdit[]}
 */
function whitespaceEdits(tokens, trimRows) {
  /** @type {{ math?: boolean, variable?: boolean }[]} */
  const stack = [];
  /** @type {TokenEdit[]} */
  const edits = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const type = token[0];
    if (type !== TokenType.String && token[1].includes('\\9')) {
      unhack(edits, tokens, index);
    }
    if (type === TokenType.Function) {
      const name = asciiLowerCase(decoded(token));
      const isVariable = variableFunctions.has(name);
      const parentContext = stack[stack.length - 1];
      stack.push({
        math: Boolean(parentContext?.math || mathFunctions.has(name)),
        variable: isVariable,
      });
      continue;
    }
    if (isOpeningToken(type)) {
      const parentContext = stack[stack.length - 1];
      stack.push({
        math: Boolean(parentContext?.math),
        variable: Boolean(parentContext?.variable),
      });
      continue;
    }
    if (isClosingToken(type)) {
      stack.pop();
      continue;
    }
    if (trimRows && type === TokenType.String && stack.length === 0) {
      const row = trimGridRow(token[1]);
      if (row !== token[1]) {
        edits.push(replaceToken(index, [stringToken(row, row.slice(1, -1))]));
      }
      continue;
    }
    if (type === TokenType.Whitespace) {
      const edit = whitespaceEdit(tokens, index, stack);
      if (edit) edits.push(edit);
    }
  }
  return edits;
}

/**
 * Trims the whitespace of a value in the buffer, edited as tokens. A value
 * without whitespace is left alone, so it is not tokenized.
 *
 * @param {boolean} trimRows whether top-level strings are grid area rows
 * @returns {Reducer}
 */
function valueReducer(trimRows) {
  return (buffer) => {
    if (!buffer.isEdited() && !hasWhitespaceRegex.test(buffer.text())) return;
    const edits = whitespaceEdits(buffer.tokens(), trimRows);
    if (edits.length) buffer.replaceRanges(edits);
  };
}

const trimValue = valueReducer(false);
const trimGridValue = valueReducer(true);

/**
 * The stage of the value part. A custom property keeps its value as written.
 * It runs last in each plan, so the whitespace it leaves is final.
 * @type {Stage}
 */
const valueStage = {
  forProperty(property) {
    if (property.startsWith('--')) return null;
    return gridRowsPropertyRegex.test(property) ? trimGridValue : trimValue;
  },
};

/** @satisfies {StageEntry} */
export const valueEntry = { create: () => valueStage };

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-whitespace',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          normalizeRecordRaws(records, context.tokenLists);
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
