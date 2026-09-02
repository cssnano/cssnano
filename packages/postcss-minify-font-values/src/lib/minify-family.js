import cssnanoUtils from 'cssnano-utils';

const { TokenType, tokens } = cssnanoUtils;

const globalKeywords = new Set(['inherit', 'initial', 'unset']);
const generic = new Set([
  'sans-serif',
  'serif',
  'fantasy',
  'cursive',
  'monospace',
  'system-ui',
]);
const keyword = new RegExp([...generic, ...globalKeywords].join('|'), 'i');
const digit = /^\d/;
const escapeCharacter = /[\t\n\v\f:]/;
const simpleEscape = /[ !"#$%&'()*+,./<=>?@[\\\]^`{|}~]/;
const invalidIdentifier = /^(-?\d|--)/;
const identifier = /^[a-zA-Z\d\xa0-\uffff_-]+$/;

/** @param {string} string */
function escapeIdentifierSequence(string) {
  /** @param {string} part @param {boolean} stringContext */
  const escape = (part, stringContext) => {
    let result = '';
    for (const character of part) {
      if (!stringContext && escapeCharacter.test(character))
        result += `\\${character.codePointAt(0)?.toString(16)} `;
      else
        result +=
          !stringContext && simpleEscape.test(character)
            ? `\\${character}`
            : character;
    }
    if (!stringContext && invalidIdentifier.test(result))
      result = result.startsWith('-')
        ? `\\-${result.slice(1)}`
        : `\\3${result[0]} ${result.slice(1)}`;
    return result;
  };
  const parts = string.split(/[\t\n\f\r ]/g);
  const escapedParts = [];
  for (const [index, part] of parts.entries()) {
    if (!part) {
      escapedParts.push(part);
      continue;
    }
    if (identifier.test(part) && invalidIdentifier.test(part) && index > 0) {
      escapedParts[index - 1] = `${escapedParts[index - 1]}\\`;
      escapedParts.push(escape(part, true));
      continue;
    }
    escapedParts.push(escape(part, false));
  }
  let result = escapedParts.join(' ');
  result = result.replace(
    /(\\(?:[a-fA-F0-9]{1,6} | ))?( {2,})/g,
    (_, prefix, spaces) => {
      const escaped = Array.from(
        { length: Math.ceil(spaces.length / 2) },
        () => '\\ '
      );
      if (spaces.length % 2) escaped[escaped.length - 1] += '\\ ';
      return (prefix ?? '') + ' ' + escaped.join(' ');
    }
  );
  if (result.endsWith(' ') && !/\\[a-fA-F0-9]{0,6} $/.test(result))
    result = `${result.slice(0, -1)}\\ `;
  return result.startsWith(' ') ? `\\ ${result.slice(1)}` : result;
}

/** @param {string} value @param {import('../index.js').Options} opts @return {string} */
function minifyFamily(value, opts) {
  if (Array.isArray(value))
    throw new TypeError('minifyFamily accepts a CSS value string');
  const input = tokens(value);
  /** @type {string[]} */
  const families = [];
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  let familyTokens = [];
  let depth = 0;
  const finish = () => {
    const token = familyTokens.find((item) => item[0] === TokenType.String);
    let family = familyTokens
      .map((item) => (item[0] === TokenType.Whitespace ? '\0' : item[1]))
      .join('')
      .replace(/^\0+|\0+$/g, '')
      .replace(/\0+/g, ' ')
      .replace(/\s*,\s*/g, ',');
    const raw = /** @type {{value?: string}|undefined} */ (token?.[4])?.value;
    if (
      typeof raw === 'string' &&
      token?.[0] === TokenType.String &&
      !token[1].includes('\\') &&
      opts.removeQuotes &&
      !keyword.test(raw) &&
      !digit.test(raw)
    ) {
      const escaped = escapeIdentifierSequence(raw);
      if (escaped.length < raw.length + 2) family = escaped;
    }
    families.push(family);
    familyTokens = [];
  };
  for (const token of input) {
    if (
      [
        TokenType.Function,
        TokenType.OpenParen,
        TokenType.OpenSquare,
        TokenType.OpenCurly,
      ].includes(token[0])
    )
      depth++;
    if (
      [
        TokenType.CloseParen,
        TokenType.CloseSquare,
        TokenType.CloseCurly,
      ].includes(token[0])
    )
      depth--;
    if (token[0] === TokenType.Comma && depth === 0) {
      finish();
    } else {
      familyTokens.push(token);
    }
  }
  finish();
  let result = families.filter(Boolean);
  if (opts.removeAfterKeyword) {
    const index = result.findIndex((item) => generic.has(item.toLowerCase()));
    if (index !== -1) result = result.slice(0, index + 1);
  }
  if (opts.removeDuplicates) {
    const seen = new Set();
    result = result.filter((item) => {
      const folded = item.toLowerCase();
      if (folded === 'monospace') return true;
      if (seen.has(folded)) return false;
      seen.add(folded);
      return true;
    });
  }
  return result.join(',');
}

export default minifyFamily;
