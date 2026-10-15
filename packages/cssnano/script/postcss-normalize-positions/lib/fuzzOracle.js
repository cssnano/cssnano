// Development-only semantic oracle. It resolves one- and two-value <position>
// syntax (CSS Values 4) to offsets with its own scanner, independent of the
// plugin's tokenizer, so a rewrite is judged by where it places the image.

const horizontalKeywords = new Map([
  ['left', '0%'],
  ['center', '50%'],
  ['right', '100%'],
]);
const verticalKeywords = new Map([
  ['top', '0%'],
  ['center', '50%'],
  ['bottom', '100%'],
]);
const hexDigit = /^[0-9a-f]$/iv;
const whitespace = /^[ \t\n\r\f]$/v;

/**
 * Decode CSS escapes so `\74 op` and `TOP` compare as the keyword `top`.
 *
 * @param {string} word
 */
function keywordOf(word) {
  let result = '';
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== '\\') {
      result += word[i];
      continue;
    }
    let hex = '';
    while (hex.length < 6 && hexDigit.test(word[i + 1] ?? '')) hex += word[++i];
    if (!hex) result += word[++i] ?? '';
    else {
      result += String.fromCodePoint(Number.parseInt(hex, 16));
      if (whitespace.test(word[i + 1] ?? '')) i++;
    }
  }
  return result.toLowerCase();
}

/**
 * A <length-percentage> offset, or undefined for any other word. Zero is the
 * same offset whatever its unit, so `0`, `0px` and `0%` agree.
 *
 * @param {string} word
 */
function offsetOf(word) {
  const lower = word.toLowerCase();
  if (/^[+\-]?0*\.?0+(?:[a-z]+|%)?$/v.test(lower)) return '0%';
  return /^[+\-]?(?:\d|\.\d)|^(?:calc|min|max|clamp)\(/v.test(lower)
    ? lower
    : undefined;
}

/**
 * Resolve a one- or two-value position to its [x, y] offsets, or undefined
 * when the words are not a valid one- or two-value position.
 *
 * @param {string[]} words
 * @return {[string, string] | undefined}
 */
function resolvePosition(words) {
  const keywords = words.map(keywordOf);
  const isKeyword = (/** @type {string} */ keyword) =>
    horizontalKeywords.has(keyword) || verticalKeywords.has(keyword);
  const horizontal = (/** @type {number} */ i) =>
    horizontalKeywords.get(keywords[i]) ??
    (isKeyword(keywords[i]) ? undefined : offsetOf(words[i]));
  const vertical = (/** @type {number} */ i) =>
    verticalKeywords.get(keywords[i]) ??
    (isKeyword(keywords[i]) ? undefined : offsetOf(words[i]));
  if (words.length === 1) {
    if (verticalKeywords.has(keywords[0]) && keywords[0] !== 'center')
      return ['50%', /** @type {string} */ (verticalKeywords.get(keywords[0]))];
    const x = horizontal(0);
    return x ? [x, '50%'] : undefined;
  }
  if (words.length !== 2) return undefined;
  const x = horizontal(0);
  const y = vertical(1);
  if (x && y) return [x, y];
  // Keyword pairs may name the vertical side first, as in `top left`.
  if (!keywords.every(isKeyword)) return undefined;
  const swappedX = horizontalKeywords.get(keywords[1]);
  const swappedY = verticalKeywords.get(keywords[0]);
  return swappedX && swappedY ? [swappedX, swappedY] : undefined;
}

/**
 * Split text at top-level occurrences of `separator`, skipping comments and
 * parenthesized groups such as `rgb(0 0 0 / 0)` or `min(80%, 40px)`.
 *
 * @param {string} text
 * @param {string} separator
 * @return {string[]}
 */
function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (depth === 0 && text[i] === separator) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * Length of the escape starting at `start`, including the whitespace that
 * ends a hex escape, as in `\74 op`.
 *
 * @param {string} text @param {number} start
 */
function escapeLength(text, start) {
  let end = start + 1;
  while (end - start <= 6 && hexDigit.test(text[end] ?? '')) end++;
  if (end === start + 1) return 2;
  return whitespace.test(text[end] ?? '') ? end - start + 1 : end - start;
}

/**
 * The whitespace-separated words of a value, ignoring comments.
 *
 * @param {string} text
 * @return {string[]}
 */
function wordsOf(text) {
  const words = [];
  let depth = 0;
  let word = '';
  for (let i = 0; i < text.length; i++) {
    if (depth === 0 && text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      if (word) words.push(word);
      word = '';
      continue;
    }
    if (text[i] === '\\') {
      const length = escapeLength(text, i);
      word += text.slice(i, i + length);
      i += length - 1;
      continue;
    }
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    if (depth === 0 && whitespace.test(text[i])) {
      if (word) words.push(word);
      word = '';
    } else word += text[i];
  }
  if (word) words.push(word);
  return words;
}

export { keywordOf, resolvePosition, splitTopLevel, wordsOf };
