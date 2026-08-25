import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenIdent, isTokenString } from '@csstools/css-tokenizer';
import { isComma, parse, stringify } from './parse.js';

const escapeCharacterRegex = /[\t\n\v\f:]/;
const digitRegex = /\d/;
const negativeNumberRegex = /^-[-\d]/;
const globalKeywords = ['inherit', 'initial', 'unset'];
const genericFontFamilykeywords = new Set([
  'sans-serif',
  'serif',
  'fantasy',
  'cursive',
  'monospace',
  'system-ui',
]);
const regexSimpleEscapeCharacters = /[ !"#$%&'()*+,./<=>?@[\\\]^`{|}~]/;
const regexKeyword = new RegExp(
  [...genericFontFamilykeywords, ...globalKeywords].join('|'),
  'i'
);
const regexInvalidIdentifier = /^(-?\d|--)/;
const regexSpaceAtStart = /^\x20/;
const regexWhitespace = /[\t\n\f\r\x20]/g;
const regexConsecutiveSpaces = /(\\(?:[a-fA-F0-9]{1,6}\x20|\x20))?(\x20{2,})/g;
const regexTrailingEscape = /\\[a-fA-F0-9]{0,6}\x20$/;
const regexTrailingSpace = /\x20$/;

function customEscape(string, escapeForString) {
  let output = '';
  for (let index = 0; index < string.length; index++) {
    const character = string[index];
    if (!escapeForString && escapeCharacterRegex.test(character))
      output += `\\${character.charCodeAt(0).toString(16)} `;
    else if (!escapeForString && regexSimpleEscapeCharacters.test(character))
      output += `\\${character}`;
    else output += character;
  }
  if (!escapeForString && negativeNumberRegex.test(output))
    output = `\\-${output.slice(1)}`;
  if (!escapeForString && digitRegex.test(string[0]))
    output = `\\3${string[0]} ${output.slice(1)}`;
  return output;
}

function escapeIdentifierSequence(string) {
  const parts = string.split(regexWhitespace);
  const result = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (!part) {
      result.push(part);
      continue;
    }
    if (regexInvalidIdentifier.test(part) && index > 0) {
      result[index - 1] += '\\';
      result.push(customEscape(part, true));
    } else result.push(customEscape(part, false));
  }
  let output = result
    .join(' ')
    .replace(regexConsecutiveSpaces, ($0, escape, spaces) => {
      const escaped = Array.from(
        { length: Math.floor(spaces.length / 2) },
        () => '\\ '
      );
      if (spaces.length % 2) escaped[escaped.length - 1] += '\\ ';
      return `${escape || ''} ${escaped.join(' ')}`;
    });
  if (regexTrailingSpace.test(output) && !regexTrailingEscape.test(output))
    output = `${output.slice(0, -1)}\\ `;
  return regexSpaceAtStart.test(output) ? `\\ ${output.slice(1)}` : output;
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} family @param {Options} opts */
function minifyComponents(family, opts) {
  const result = [];
  let words = '';
  const flush = () => {
    if (words) {
      result.push(words);
      words = '';
    }
  };
  for (let index = 0; index < family.length; index++) {
    const node = family[index];
    if (isTokenNode(node) && isTokenString(node.value)) {
      flush();
      const raw = node.toString();
      // Keep the source form for the legacy length comparison: decoded CSS
      // escapes can look shorter even though replacing them would grow output.
      const value = raw.slice(1, -1);
      if (
        !opts.removeQuotes ||
        regexKeyword.test(value) ||
        digitRegex.test(value[0])
      )
        result.push(raw);
      else {
        const escaped = escapeIdentifierSequence(value);
        result.push(escaped.length < raw.length ? escaped : raw);
      }
    } else if (isTokenNode(node) && isTokenIdent(node.value))
      words += node.toString();
    else if (node.type === 'whitespace') {
      if (words && index !== family.length - 1) words += ' ';
    } else if (isFunctionNode(node)) {
      flush();
      result.push(stringify([node]));
    } else flush();
  }
  flush();
  return result;
}

/** @param {string[]} values */
function unique(values) {
  return values.filter(
    (value, index) =>
      value.toLowerCase() === 'monospace' || index === values.indexOf(value)
  );
}

/** @param {string} value @param {Options} opts */
export default function minifyFamily(value, opts) {
  const nodes = parse(value);
  let families = [];
  let current = [];
  for (const node of nodes) {
    if (isComma(node)) {
      families.push(...minifyComponents(current, opts));
      current = [];
    } else current.push(node);
  }
  families.push(...minifyComponents(current, opts));
  if (opts.removeAfterKeyword) {
    const keyword = families.findIndex((family) =>
      genericFontFamilykeywords.has(family.toLowerCase())
    );
    if (keyword >= 0) families = families.slice(0, keyword + 1);
  }
  return (opts.removeDuplicates ? unique(families) : families).join(',');
}

/** @typedef {{removeAfterKeyword?: boolean, removeDuplicates?: boolean, removeQuotes?: boolean}} Options */
