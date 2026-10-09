import cssnanoUtils from 'cssnano-utils';
import { tokenize, TokenType } from '@csstools/css-tokenizer';

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
 * @param {import('@csstools/css-tokenizer').CSSToken[]} tokens
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
 * Normalize directly from source-backed tokenizer spans. The stack mirrors the
 * legacy walk: math descendants receive special delimiter treatment, while
 * variable functions trim whitespace around the name and comma delimiters.
 *
 * @param {string} value
 * @param {boolean} trimRows whether top-level strings are grid area rows
 * @return {string}
 */
function reduceWhitespaces(value, trimRows) {
  const tokens = [...tokenize({ css: value })].filter(
    (token) => token[0] !== TokenType.EOF
  );
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

  return applyReplacements(value, replacements);
}

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
 * Top-level strings in grid-template-areas, grid-template and grid are area
 * rows, so their values get a separate cache.
 * @param {import('postcss').Declaration} node
 * @param {Map<string, string>} cache
 * @param {Map<string, string>} gridRowsCache
 * @return {void}
 */
function trimDeclaration(node, cache, gridRowsCache) {
  // Ensure that !important values do not have any excess whitespace
  if (node.important) {
    node.raws.important = '!important';
  }
  // Remove whitespaces around ie 9 hack
  const rawValue = node.raws.value;
  const hasMatchingRaw = Boolean(
    node.raws?.value?.raw && rawValue?.value === node.value
  );
  const value = (
    rawValue?.value === node.value ? rawValue.raw : node.value
  ).replace(ieHackRegex, '$1');

  const trimRows = gridRowsPropertyRegex.test(node.prop);
  const valueCache = trimRows ? gridRowsCache : cache;
  let result;
  if (valueCache.has(value)) {
    result = /** @type {string} **/ (valueCache.get(value));
    node.value = result;
  } else {
    result = reduceWhitespaces(value, trimRows);

    // Trim whitespace inside functions & dividers
    node.value = result;
    valueCache.set(value, result);
  }
  if (hasMatchingRaw) {
    node.raws.value = { raw: result, value: result };
  }

  // Remove extra semicolons and whitespace before the declaration
  if (node.raws.before) {
    const prev = node.prev();

    if (prev && prev.type !== rule) {
      node.raws.before = node.raws.before.replaceAll(';', '');
    }
  }

  // The separator raw can also carry a preserved comment, which must survive.
  node.raws.between = trimSeparator(node.raws.between || ':');
  node.raws.semicolon = false;
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
      const declarationCache = new Map();
      const gridRowsCache = new Map();

      css.walk((node) => {
        const { type } = node;

        if ([decl, rule, atrule].includes(type) && node.raws.before) {
          node.raws.before = node.raws.before.replace(whitespaceRegex, '');
        }

        if (type === decl) {
          if (!node.prop.startsWith('--')) {
            trimDeclaration(node, declarationCache, gridRowsCache);
          } else if (node.value.trim() !== '') {
            // Custom properties skip value normalization, so only the
            // parser-consumed separator run is trimmed.
            node.raws.between = trimCustomPropertySeparator(
              node.raws.between || ':'
            );
            node.raws.semicolon = false;
          }
        } else if (type === rule || type === atrule) {
          // When the last declaration has no trailing semicolon and its
          // value ends in an escape sequence consuming whitespace (e.g.
          // `\9` written as `\` followed by a literal tab), the parser
          // attributes the escaped code point to the rule's trailing
          // raw instead of the declaration's value. Reattach the single
          // character the backslash escapes before discarding the rest
          // of that raw, or the escape is left dangling and becomes a
          // valid escape of whatever follows it in the output (`}`, or
          // even a `;` inserted as a terminator, since only a newline or
          // end of input is not a valid escape target).
          const last = node.last;

          if (
            last &&
            last.type === decl &&
            endsWithEscapingBackslash(last.value) &&
            node.raws.after
          ) {
            last.value += node.raws.after[0];
          }

          node.raws.between = node.raws.after = '';
          node.raws.semicolon = false;

          if (type === atrule && node.raws.afterName !== undefined) {
            node.raws.afterName = normalizeAfterName(node.raws.afterName);
          }
        }
      });

      // Remove final newline
      css.raws.after = '';
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
