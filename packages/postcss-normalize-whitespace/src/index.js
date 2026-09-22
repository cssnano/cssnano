import cssnanoUtils from 'cssnano-utils';
import { tokenize, TokenType } from '@csstools/css-tokenizer';

const {
  asciiLowerCase,
  decoded,
  mathFunctions,
  tokens: tokenizeValue,
} = cssnanoUtils;

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const variableFunctions = new Set(['var', 'env', 'constant']);
const ieHackRegex = /[ \t\n\r\f]*(\\9)[ \t\n\r\f]*/v;
const whitespaceRegex = /[ \t\n\r\f]/gv;

const plainSeparatorRegex = /^[ \t\n\r\f]*:[ \t\n\r\f]*$/v;

/**
 * Reports whether a value ends in a backslash that begins an escape
 * sequence, as opposed to a backslash that is itself escaped by a
 * preceding backslash.
 * @param {string} value
 * @return {boolean}
 */
function endsWithEscapingBackslash(value) {
  let backslashes = 0;

  for (let i = value.length - 1; i >= 0 && value[i] === '\\'; i--) {
    backslashes++;
  }

  return backslashes % 2 === 1;
}

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
  const context = stack.at(-1);
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
 * Normalize directly from source-backed tokenizer spans. The stack mirrors the
 * legacy walk: math descendants receive special delimiter treatment, while
 * variable functions trim whitespace around the name and comma delimiters.
 *
 * @param {string} value
 * @return {string}
 */
function reduceWhitespaces(value) {
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
      stack.push({
        math: Boolean(stack.at(-1)?.math || mathFunctions.has(name)),
        variable: isVariable,
      });
      continue;
    }
    if (isOpeningToken(type)) {
      stack.push({
        math: Boolean(stack.at(-1)?.math),
        variable: Boolean(stack.at(-1)?.variable),
      });
      continue;
    }
    if (isClosingToken(type)) {
      stack.pop();
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
 *
 * @param {import('postcss').Declaration} node
 * @param {Map<string, string>} cache
 * @return {void}
 */
function trimDeclaration(node, cache) {
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

  let result;
  if (cache.has(value)) {
    result = /** @type {string} **/ (cache.get(value));
    node.value = result;
  } else {
    result = reduceWhitespaces(value);

    // Trim whitespace inside functions & dividers
    node.value = result;
    cache.set(value, result);
  }
  if (hasMatchingRaw) {
    node.raws.value = { raw: result, value: result };
  }

  // Remove extra semicolons and whitespace before the declaration
  if (node.raws.before) {
    const prev = node.prev();

    if (prev && prev.type !== rule) {
      node.raws.before = node.raws.before.replace(/;/gv, '');
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

      css.walk((node) => {
        const { type } = node;

        if ([decl, rule, atrule].includes(type) && node.raws.before) {
          node.raws.before = node.raws.before.replace(whitespaceRegex, '');
        }

        if (type === decl) {
          if (!node.prop.startsWith('--')) {
            trimDeclaration(node, declarationCache);
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
