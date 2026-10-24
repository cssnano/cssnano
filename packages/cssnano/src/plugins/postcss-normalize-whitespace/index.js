import cssnanoUtils from '#utils';
import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const {
  asciiLowerCase,
  decoded,
  endsWithEscapingBackslash,
  mathFunctions,
  tokens: tokenizeValue,
} = cssnanoUtils;

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const gridRowsPropertyRegex = /^(?:grid|grid-template|grid-template-areas)$/iv;
const variableFunctions = new Set(['var', 'env', 'constant']);
const ieHackRegex = /[ \t\n\r\f]*(\\9)[ \t\n\r\f]*/v;
const whitespaceRegex = /[ \t\n\r\f]/gv;
const hasWhitespaceRegex = /[ \t\n\r\f]/v;
const quoteRegex = /["']/v;

const plainSeparatorRegex = /^[ \t\n\r\f]*:[ \t\n\r\f]*$/v;

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
 * @param {string} value
 * @param {[number, number, string][]} replacements
 * @return {string}
 */
function applyReplacements(value, replacements) {
  if (!replacements.length) return value;
  const pieces = [];
  let start = 0;
  for (const [from, to, replacement] of replacements) {
    if (from > start) pieces.push(value.slice(start, from));
    pieces.push(replacement);
    start = to;
  }
  if (start < value.length) {
    pieces.push(value.slice(start));
  }
  return pieces.join('');
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
 * The replacements that trim and collapse the whitespace of a value. The stack
 * mirrors the legacy walk: math descendants receive special delimiter
 * treatment, while variable functions trim whitespace around the name and comma
 * delimiters.
 *
 * @param {readonly CSSToken[]} tokens the tokens of the value, without EOF
 * @param {boolean} trimRows whether top-level strings are grid area rows
 * @return {[number, number, string][]}
 */
function whitespaceReplacements(tokens, trimRows) {
  /** @type {{ math?: boolean, variable?: boolean }[]} */
  const stack = [];
  /** @type {[number, number, string][]} */
  const replacements = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const type = token[0];
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
        replacements.push([token[2], token[3] + 1, row]);
      }
      continue;
    }
    if (type !== TokenType.Whitespace) continue;
    const replacement = whitespaceReplacement(tokens, index, stack);
    if (replacement !== token[1]) {
      replacements.push([token[2], token[3] + 1, replacement]);
    }
  }
  return replacements;
}

/**
 * Removes the whitespace around each IE hack outside strings. A string keeps
 * its text, so the whitespace inside it is part of the value.
 *
 * @param {string} text
 * @return {string}
 */
function unhackOutsideStrings(text) {
  if (!text.includes('\\9')) return text;
  // Without a quote there is no string to keep, so the text is not tokenized.
  if (!quoteRegex.test(text)) return text.replace(ieHackRegex, '$1');
  let unhacked = '';
  let cursor = 0;
  for (const token of tokenizeValue(text)) {
    if (token[0] !== TokenType.String) continue;
    unhacked +=
      text.slice(cursor, token[2]).replace(ieHackRegex, '$1') + token[1];
    cursor = token[3] + 1;
  }
  return unhacked + text.slice(cursor).replace(ieHackRegex, '$1');
}

/**
 * Trims the whitespace of a value in the buffer. The IE hack's `\9` is read
 * without the whitespace around it first. Text without whitespace is left
 * alone, so it is not tokenized.
 *
 * @param {boolean} trimRows whether top-level strings are grid area rows
 * @returns {Reducer}
 */
function valueReducer(trimRows) {
  return (buffer) => {
    const text = buffer.text();
    if (!hasWhitespaceRegex.test(text)) return;
    const unhacked = unhackOutsideStrings(text);
    if (unhacked !== text) buffer.replaceText(unhacked);
    const source = buffer.text();
    const result = applyReplacements(
      source,
      whitespaceReplacements(buffer.tokens(), trimRows)
    );
    if (result !== source) buffer.replaceText(result);
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
 * Drop whole whitespace tokens; character-level replacement would reach
 * preserved comments.
 * @param {string} between
 * @return {string}
 */
function trimSeparator(between) {
  if (plainSeparatorRegex.test(between)) return ':';
  return tokenizeValue(between)
    .filter(([type]) => type !== TokenType.Whitespace)
    .map(([, raw]) => raw)
    .join('');
}

/**
 * Trim only the parser-consumed whitespace run around the colon (CSS
 * Variables 1).
 * @param {string} between
 * @return {string}
 */
function trimCustomPropertySeparator(between) {
  if (plainSeparatorRegex.test(between)) return ':';
  const tokens = tokenizeValue(between).filter(
    ([type]) => type !== TokenType.EOF
  );
  let start = 0;
  while (tokens[start]?.[0] === TokenType.Whitespace) start++;
  if (tokens[start]?.[0] === TokenType.Colon) {
    // The colon stays; only its surrounding parser-consumed whitespace runs
    // may go.
    start++;
    while (tokens[start]?.[0] === TokenType.Whitespace) start++;
    return (
      ':' +
      tokens
        .slice(start)
        .map(([, raw]) => raw)
        .join('')
    );
  }
  // A kept comment before the colon interrupts the parser-consumed run;
  // leave the authored separator untouched.
  return between;
}

/**
 * Collapses multi-character whitespace runs in at-rule afterName to a single
 * space while preserving comments.
 * @param {string} afterName
 * @return {string}
 */
function normalizeAfterName(afterName) {
  if (!afterName || afterName === ' ') return afterName;
  if (!afterName.includes('/*')) return ' ';
  let result = '';
  for (const [type, raw] of tokenizeValue(afterName)) {
    result += type === TokenType.Whitespace ? ' ' : raw;
  }
  return result;
}

/**
 * Trims the raws of a declaration that are not its value: the important flag
 * and the separator, whose comment must survive.
 * @param {import('postcss').Declaration} node
 * @return {void}
 */
function trimDeclaration(node) {
  // Ensure that !important values do not have any excess whitespace
  if (node.important) {
    node.raws.important = '!important';
  }
  // The separator raw can also carry a preserved comment, which must survive.
  node.raws.between = trimSeparator(node.raws.between || ':');
  node.raws.semicolon = false;
}

/**
 * Trims the raws of one node that are not its value, so the walk after merge
 * can run it on each node it keeps.
 *
 * @param {import('postcss').AnyNode} node
 * @return {void}
 */
export function normalizeNodeRaws(node) {
  const { type } = node;

  if ([decl, rule, atrule].includes(type) && node.raws.before) {
    node.raws.before = node.raws.before.replaceAll(whitespaceRegex, '');
  }

  if (type === decl) {
    if (!node.prop.startsWith('--')) {
      trimDeclaration(node);
    } else if (node.value.trim() !== '') {
      // Custom properties skip value normalization, so only the
      // parser-consumed separator run is trimmed.
      node.raws.between = trimCustomPropertySeparator(node.raws.between || ':');
      node.raws.semicolon = false;
    }
  } else if (type === rule || type === atrule) {
    node.raws.between = node.raws.after = '';
    node.raws.semicolon = false;

    if (type === atrule && node.raws.afterName !== undefined) {
      node.raws.afterName = normalizeAfterName(node.raws.afterName);
    }
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-whitespace',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walk(normalizeNodeRaws);

      // Remove final newline
      css.raws.after = '';
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
