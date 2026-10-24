import cssnanoUtils from '#utils';
import cssWideKeywords from '../data/cssWideKeywords.json' with { type: 'json' };
import { balancedStructure } from '../../../utils/value.js';
import {
  identifierWithText,
  whitespace,
} from '../../../values/tokenConstructors.js';
import { comma } from '../../../values/listSeparators.js';

const { TokenType, asciiLowerCase, decoded, tokens } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Options} from '../index.js' */

/* `default` and `none` are reserved for font family names although they are
 * not CSS-wide. */
const globalKeywords = new Set([
  ...cssWideKeywords.keywords,
  'default',
  'none',
]);
const generic = new Set([
  'sans-serif',
  'serif',
  'fantasy',
  'cursive',
  'monospace',
  'system-ui',
  'math',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'fangsong',
]);
const completeGeneric = new Set([
  'sans-serif',
  'serif',
  'fantasy',
  'cursive',
  'monospace',
  'system-ui',
]);
const systemFont = new Set([
  'caption',
  'icon',
  'menu',
  'message-box',
  'small-caption',
  'status-bar',
]);
const digit = /^\d/v;
const escapeCharacter = /[\t\n\v\f:]/v;
const simpleEscape = /[ !"#$%\x26'\(\)*+,.\/<=>?@\[\\\]^`\{\|\}~]/v;
const invalidIdentifier = /^(-?\d|--)/v;
const identifier = /^[a-zA-Z\d\xa0-￿_\-]+$/v;

/** @param {string} value */
function containsReservedComponent(value) {
  return value.split(/[\t\n\f\r ]+/v).some((part) => {
    const name = asciiLowerCase(part);
    return (
      generic.has(name) || globalKeywords.has(name) || systemFont.has(name)
    );
  });
}

/**
 * The spelling of one word, with its characters escaped where the tokenizer
 * would read them otherwise.
 *
 * @param {string} word
 * @return {string}
 */
function escapeWord(word) {
  let text = '';
  for (const character of word) {
    if (escapeCharacter.test(character)) {
      text += `\\${character.codePointAt(0)?.toString(16)} `;
    } else {
      text += simpleEscape.test(character) ? `\\${character}` : character;
    }
  }
  if (invalidIdentifier.test(text)) {
    text = text.startsWith('-')
      ? `\\-${text.slice(1)}`
      : `\\3${text[0]} ${text.slice(1)}`;
  }
  // A lone hyphen reads as a delim token, so it needs its own escape.
  if (text === '-') text = '\\-';
  return text;
}

/**
 * Adds a spelling and its value to the last identifier, or starts the first.
 *
 * @param {{text: string, value: string}[]} identifiers
 * @param {string} text
 * @param {string} value
 */
function append(identifiers, text, value) {
  const last = identifiers.at(-1);
  if (last) {
    last.text += text;
    last.value += value;
  } else {
    identifiers.push({ text, value });
  }
}

/**
 * Writes `count` spaces as escaped spaces. Between two escapes the space is
 * an escape too, so only every second space separates identifiers, and the
 * last space joins the word that follows.
 *
 * @param {{text: string, value: string}[]} identifiers
 * @param {number} count
 * @param {boolean} leading the spaces start the name, so none separates
 */
function appendSpaces(identifiers, count, leading) {
  for (let index = 0; index < count; index++) {
    if (!leading && index % 2 === 0 && index < count - 1) {
      identifiers.push({ text: '', value: '' });
      continue;
    }
    append(identifiers, '\\ ', ' ');
  }
}

/**
 * Writes a family name as identifiers. The values of the identifiers, joined
 * by single spaces, give the name back. Each spelling is the one that reads
 * back as that identifier.
 *
 * @param {string} name the decoded family name
 * @return {{text: string, value: string}[]}
 */
function familyIdentifiers(name) {
  const pieces = name.replaceAll(/[\t\n\f\r]/gv, ' ').split(' ');
  /** @type {{text: string, value: string}[]} */
  const identifiers = [];
  let previousWord = false;
  let lastWord = 0;
  for (let index = 0; index < pieces.length; index++) {
    const word = pieces[index];
    if (!word) continue;
    const gap = index - lastWord;
    // A digit-led word after a space reads as a hex escape unless the space is escaped.
    const mergeable =
      index > 0 && identifier.test(word) && invalidIdentifier.test(word);
    const text = mergeable ? word : escapeWord(word);
    if (!previousWord) {
      if (gap > 0) appendSpaces(identifiers, gap, true);
      append(identifiers, text, word);
    } else if (gap === 1 && mergeable) {
      append(identifiers, `\\ ${text}`, ` ${word}`);
    } else if (gap === 1) {
      identifiers.push({ text, value: word });
    } else {
      appendSpaces(identifiers, gap, false);
      append(identifiers, text, word);
    }
    previousWord = true;
    lastWord = index;
  }
  const trailing = pieces.length - 1 - lastWord;
  if (trailing > 0) appendSpaces(identifiers, trailing, !previousWord);
  return identifiers;
}

/**
 * The text of a token list.
 *
 * @param {readonly CSSToken[]} list
 * @return {string}
 */
function tokensText(list) {
  let text = '';
  for (const token of list) text += token[1];
  return text;
}

/**
 * The tokens with each run of whitespace as one space, and none at the edges.
 *
 * @param {readonly CSSToken[]} segment
 * @return {CSSToken[]}
 */
function collapseSpaces(segment) {
  /** @type {CSSToken[]} */
  const result = [];
  let spaced = false;
  for (const token of segment) {
    if (token[0] === TokenType.Whitespace) {
      spaced = result.length > 0;
      continue;
    }
    if (spaced) result.push(whitespace());
    spaced = false;
    result.push(token);
  }
  return result;
}

/**
 * The identifiers as tokens, with a space between each pair.
 *
 * @param {{text: string, value: string}[]} identifiers
 * @return {CSSToken[]}
 */
function identifierTokens(identifiers) {
  /** @type {CSSToken[]} */
  const result = [];
  for (const [index, item] of identifiers.entries()) {
    if (index > 0) result.push(whitespace());
    result.push(identifierWithText(item.text, item.value));
  }
  return result;
}

/**
 * The family name of one comma-separated segment: its own tokens, or the
 * escaped identifiers when those are shorter than the quoted name.
 *
 * @param {readonly CSSToken[]} segment
 * @param {Options['removeQuotes']} removeQuotes
 * @return {{tokens: CSSToken[], folded: string, completeGeneric: boolean}}
 */
function familyOf(segment, removeQuotes) {
  const meaningful = segment.filter(
    (item) => item[0] !== TokenType.Whitespace && item[0] !== TokenType.Comment
  );
  /** @type {CSSToken|undefined} */
  const token = meaningful.length === 1 ? meaningful[0] : undefined;
  const raw = token && decoded(token);
  const isReservedString =
    typeof raw === 'string' && containsReservedComponent(raw);
  let family = collapseSpaces(segment);
  if (
    typeof raw === 'string' &&
    token?.[0] === TokenType.String &&
    !token[1].includes('\\') &&
    removeQuotes &&
    !isReservedString &&
    !/^generic\([^\)]*\)$/v.test(asciiLowerCase(raw)) &&
    !digit.test(raw)
  ) {
    const identifiers = familyIdentifiers(raw);
    const spelledLength =
      identifiers.reduce((length, item) => length + item.text.length, 0) +
      Math.max(0, identifiers.length - 1);
    if (spelledLength < raw.length + 2) family = identifierTokens(identifiers);
  }
  return {
    tokens: family,
    folded:
      typeof raw === 'string' && !isReservedString
        ? asciiLowerCase(raw)
        : asciiLowerCase(tokensText(family)),
    completeGeneric:
      meaningful.length === 1 &&
      token?.[0] === TokenType.Ident &&
      completeGeneric.has(asciiLowerCase(decoded(token))),
  };
}

/**
 * The font-family list as tokens, minified. The list is unchanged when its
 * brackets do not balance.
 *
 * @param {readonly CSSToken[]} input
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {CSSToken[]}
 */
function minifyFamilyTokens(input, opts, removeQuotes = opts.removeQuotes) {
  const balanced = balancedStructure(input);
  if (!balanced) return [...input];
  /** @type {{tokens: CSSToken[], folded: string, completeGeneric: boolean}[]} */
  let families = balanced
    .topLevelSegments()
    .map(({ startIndex, endIndex }) =>
      familyOf(input.slice(startIndex, endIndex), removeQuotes)
    )
    .filter((family) => family.tokens.length > 0);
  if (opts.removeAfterKeyword) {
    const index = families.findIndex((family) => family.completeGeneric);
    if (index !== -1) families = families.slice(0, index + 1);
  }
  if (opts.removeDuplicates) {
    const seen = new Set();
    families = families.filter((item) => {
      if (item.folded === 'monospace') return true;
      if (seen.has(item.folded)) return false;
      seen.add(item.folded);
      return true;
    });
  }
  /** @type {CSSToken[]} */
  const result = [];
  for (const family of families) {
    if (result.length > 0) result.push(comma());
    for (const token of family.tokens) result.push(token);
  }
  return result;
}

/**
 * The font-family value as a string, minified.
 *
 * @param {string} value
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {string}
 */
function minifyFamily(value, opts, removeQuotes = opts.removeQuotes) {
  if (Array.isArray(value))
    throw new TypeError('minifyFamily accepts a CSS value string');
  return tokensText(minifyFamilyTokens(tokens(value), opts, removeQuotes));
}

export default minifyFamily;
export { familyIdentifiers, minifyFamilyTokens, tokensText };
