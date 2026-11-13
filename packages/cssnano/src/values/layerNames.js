import cssnanoUtils from '#utils';

const { asciiLowerCase, decoded, TokenType } = cssnanoUtils;

/** CSS-wide keywords are not valid in a `<layer-name>` (CSS Cascade 5). */
const cssWideKeywords = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
]);

/** Separates path segments in a layer key; no decoded `<ident>` contains it. */
export const SEPARATOR = '\0';

/**
 * Builds the key of one `<layer-name>`, `<ident> ['.' <ident>]*`, from its
 * tokens. Whitespace is allowed only around the name, not between segments.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} list
 * @param {number} from
 * @param {number} to exclusive
 * @return {string | undefined} decoded segments joined by {@link SEPARATOR}
 */
function layerNameKey(list, from, to) {
  let start = from;
  let end = to;
  while (start < end && list[start][0] === TokenType.Whitespace) {
    start += 1;
  }
  if (start === end) {
    return undefined;
  }
  // list[start] is not whitespace, so trimming from the end stops before it.
  while (list[end - 1][0] === TokenType.Whitespace) {
    end -= 1;
  }
  if ((end - start) % 2 === 0) {
    return undefined;
  }

  let key = '';
  for (let index = start; index < end; index += 1) {
    const token = list[index];
    if ((index - start) % 2) {
      if (token[0] !== TokenType.Delim || token[1] !== '.') {
        return undefined;
      }
    } else {
      if (token[0] !== TokenType.Ident) {
        return undefined;
      }
      const segment = decoded(token);
      if (cssWideKeywords.has(asciiLowerCase(segment))) {
        return undefined;
      }
      key += (key && SEPARATOR) + segment;
    }
  }
  return key;
}

/**
 * Parses `<layer-name>#` per CSS Cascade 5. Browsers ignore a statement
 * with any invalid name, so those return `undefined` and declare nothing,
 * as does an empty prelude, which names no layer.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} prelude the
 *   tokens of the prelude
 * @return {string[] | undefined}
 */
export function parseLayerNames(prelude) {
  const list = prelude.filter((token) => token[0] !== TokenType.Comment);
  /** @type {string[]} */
  const names = [];
  let from = 0;
  for (let index = 0; index <= list.length; index += 1) {
    if (index === list.length || list[index][0] === TokenType.Comma) {
      const key = layerNameKey(list, from, index);
      if (key === undefined) {
        return undefined;
      }
      names.push(key);
      from = index + 1;
    }
  }
  return names;
}

/**
 * @param {string} parent key of the enclosing layer, '' outside layers
 * @param {string} name never empty: an `<ident>` has at least one code point
 * @return {string}
 */
export function joinKey(parent, name) {
  return parent ? parent + SEPARATOR + name : name;
}
