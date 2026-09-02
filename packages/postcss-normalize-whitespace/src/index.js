import { tokenize, TokenType } from '@csstools/css-tokenizer';

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const variableFunctions = new Set(['var', 'env', 'constant']);
const ieHackRegex = /\s*(\\9)\s*/;
const whitespaceRegex = /\s/g;

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
function isDivider(token) {
  return (
    token?.[0] === TokenType.Comma ||
    (token?.[0] === TokenType.Delim && token[1] === '/')
  );
}

/** @param {import('@csstools/css-tokenizer').CSSToken | undefined} previous @param {import('@csstools/css-tokenizer').CSSToken | undefined} next @param {{ calc?: boolean, variable?: boolean } | undefined} context */
function removesWhitespace(previous, next, context) {
  if (context?.variable) return false;
  return (
    previous?.[0] === TokenType.Function ||
    previous?.[0] === TokenType.OpenParen ||
    next?.[0] === TokenType.CloseParen
  );
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken[]} tokens
 * @param {number} index
 * @param {{ calc?: boolean, variable?: boolean }[]} stack
 * @return {string}
 */
function whitespaceReplacement(tokens, index, stack) {
  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  const context = stack.at(-1);
  if (previous && endsWithEscapingBackslash(previous[1]))
    return tokens[index][1];
  const besideFunctionBoundary = removesWhitespace(previous, next, context);
  const besideDivider =
    !context?.calc && (isDivider(previous) || isDivider(next));
  const variableTrailingFallback =
    context?.variable &&
    previous?.[0] === TokenType.Comma &&
    next?.[0] === TokenType.CloseParen;
  return !variableTrailingFallback && (besideFunctionBoundary || besideDivider)
    ? ''
    : ' ';
}

/**
 * Normalize directly from source-backed tokenizer spans. The stack mirrors the
 * legacy walk: calc descendants receive special delimiter treatment, while
 * variable functions retain their immediate inner whitespace.
 *
 * @param {string} value
 * @return {string}
 */
function reduceWhitespaces(value) {
  const tokens = [...tokenize({ css: value })].filter(
    (token) => token[0] !== TokenType.EOF
  );
  /** @type {{ calc?: boolean, variable?: boolean }[]} */
  const stack = [];
  /** @type {[number, number, string][]} */
  const replacements = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const type = token[0];
    if (type === TokenType.Function) {
      const name = token[1].slice(0, -1).toLowerCase();
      stack.push({
        calc: stack.at(-1)?.calc || name === 'calc',
        variable: variableFunctions.has(name),
      });
      continue;
    }
    if (isOpeningToken(type)) {
      stack.push({ ...stack.at(-1) });
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

  if (!replacements.length) return value;
  let result = '';
  let start = 0;
  for (const [from, to, replacement] of replacements) {
    result += value.slice(start, from) + replacement;
    start = to;
  }
  return result + value.slice(start);
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
  const value = (node.raws.value?.raw ?? node.value).replace(ieHackRegex, '$1');

  if (cache.has(value)) {
    node.value = /** @type {string} **/ (cache.get(value));
  } else {
    const result = reduceWhitespaces(value);

    // Trim whitespace inside functions & dividers
    node.value = result;
    cache.set(value, result);
  }

  // Remove extra semicolons and whitespace before the declaration
  if (node.raws.before) {
    const prev = node.prev();

    if (prev && prev.type !== rule) {
      node.raws.before = node.raws.before.replace(/;/g, '');
    }
  }

  node.raws.between = ':';
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

        if (type === decl && !node.prop.startsWith('--')) {
          trimDeclaration(node, declarationCache);
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
