import { tokenize, TokenType } from '@csstools/css-tokenizer';

/**
 * @param {string} selectors
 * @return {{start: number, end: number, comments: {start: number, end: number, text: string}[]}[]}
 */
function splitSelectors(selectors) {
  /** @type {{start: number, end: number, comments: {start: number, end: number, text: string}[]}[]} */
  const parts = [];
  let start = 0;
  let depth = 0;
  /** @type {{start: number, end: number, text: string}[]} */
  let comments = [];

  for (const token of tokenize({ css: selectors })) {
    const [type, , tokenStart, tokenEnd] = token;

    if (type === TokenType.Comment) {
      comments.push({
        start: tokenStart,
        end: tokenEnd + 1,
        text: token[1],
      });
    }

    if (type === TokenType.Comma && depth === 0) {
      parts.push({ start, end: tokenStart, comments });
      start = tokenEnd + 1;
      comments = [];
      continue;
    }

    if (
      type === TokenType.Function ||
      type === TokenType.OpenParen ||
      type === TokenType.OpenSquare ||
      type === TokenType.OpenCurly
    ) {
      depth++;
    } else if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.CloseCurly
    ) {
      depth = Math.max(0, depth - 1);
    }
  }

  parts.push({ start, end: selectors.length, comments });

  // PostCSS's selector parser associates trailing whitespace with the
  // preceding selector, while a trailing empty selector is discarded.
  const last = parts.at(-1);
  if (last && !selectors.slice(last.start, last.end).trim()) {
    // The parser preserves an empty selector for comment-free input, even
    // though it discards one when comments are present in the selector list.
    if (last.start !== last.end) {
      if (parts.length > 1) {
        parts[parts.length - 2].end = last.end;
      }
      parts.pop();
    } else if (selectors.includes('/*')) {
      parts.pop();
    }
  }

  return parts;
}

/**
 * @param {string} selectors
 * @param {{start: number, end: number, comments: {start: number, end: number, text: string}[]}} part
 * @return {[string, string]}
 */
function selectorText(selectors, part) {
  const source = selectors.slice(part.start, part.end);
  /** @type {string[]} */
  const keyParts = [];
  let start = part.start;

  for (const comment of part.comments) {
    keyParts.push(selectors.slice(start, comment.start));
    start = comment.end;
  }

  keyParts.push(selectors.slice(start, part.end));
  return [keyParts.join('').trim(), source];
}

/**
 * @param {string} selectors
 * @return {string}
 */
function generateUniqueSelector(selectors) {
  // No comma means a single selector; nothing to dedupe or sort.
  if (!selectors.includes(',')) {
    return selectors;
  }
  /** @type {Map<string, {selector: string, comments: string[]}>} */
  const uniqueSelectors = new Map();

  for (const part of splitSelectors(selectors)) {
    const [key, text] = selectorText(selectors, part);
    const selector = uniqueSelectors.get(key);
    if (selector === undefined) {
      uniqueSelectors.set(key, { selector: text, comments: [] });
    } else if (part.comments.length) {
      // Comments on duplicate selectors are concatenated to the first selector.
      selector.comments.push(...part.comments.map((comment) => comment.text));
    }
  }

  return [...uniqueSelectors.entries()]
    .toSorted(([a], [b]) => {
      if (a > b) {
        return 1;
      } else {
        return a < b ? -1 : 0;
      }
    })
    .map(([, selector]) => selector.selector + selector.comments.join(''))
    .join();
}
/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-unique-selectors',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walkRules((nodes) => {
        if (nodes.raws.selector && nodes.raws.selector.raw) {
          nodes.raws.selector.raw = generateUniqueSelector(
            nodes.raws.selector.raw
          );
        } else {
          nodes.selector = generateUniqueSelector(nodes.selector);
        }
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
