import cssnanoUtils from 'cssnano-utils';

const { TokenType, balancedTokens, decoded } = cssnanoUtils;

const globalKeywords = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
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
const digit = /^\d/;
const escapeCharacter = /[\t\n\v\f:]/;
const simpleEscape = /[ !"#$%&'()*+,./<=>?@[\\\]^`{|}~]/;
const invalidIdentifier = /^(-?\d|--)/;
const identifier = /^[a-zA-Z\d\xa0-\uffff_-]+$/;

/** @param {string} value */
function containsReservedComponent(value) {
  return value.split(/[\t\n\f\r ]+/).some((part) => {
    const name = part.toLowerCase();
    return (
      generic.has(name) || globalKeywords.has(name) || systemFont.has(name)
    );
  });
}

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
function minifyFamily(value, opts, removeQuotes = opts.removeQuotes) {
  if (Array.isArray(value))
    throw new TypeError('minifyFamily accepts a CSS value string');
  const balanced = balancedTokens(value);
  if (!balanced) return value;
  const input = balanced.tokens;
  /** @type {{value: string, folded: string, completeGeneric: boolean}[]} */
  const families = [];
  /** @param {number} startIndex @param {number} endIndex */
  const finish = (startIndex, endIndex) => {
    const familyTokens = input.slice(startIndex, endIndex);
    const meaningful = familyTokens.filter(
      (item) =>
        item[0] !== TokenType.Whitespace && item[0] !== TokenType.Comment
    );
    /** @type {import('@csstools/css-tokenizer').CSSToken|undefined} */
    const token = meaningful.length === 1 ? meaningful[0] : undefined;
    let family = familyTokens
      .map((item) => (item[0] === TokenType.Whitespace ? '\0' : item[1]))
      .join('')
      .replace(/^\0+|\0+$/g, '')
      .replace(/\0+/g, ' ');
    const raw = token && decoded(token);
    const isReservedString =
      typeof raw === 'string' && containsReservedComponent(raw);
    if (
      typeof raw === 'string' &&
      token?.[0] === TokenType.String &&
      !token[1].includes('\\') &&
      removeQuotes &&
      !isReservedString &&
      !/^generic\([^)]*\)$/i.test(raw) &&
      !digit.test(raw)
    ) {
      const escaped = escapeIdentifierSequence(raw);
      if (escaped.length < raw.length + 2) family = escaped;
    }
    families.push({
      value: family,
      folded:
        typeof raw === 'string' && !isReservedString
          ? raw.toLowerCase()
          : family.toLowerCase(),
      completeGeneric:
        meaningful.length === 1 &&
        token?.[0] === TokenType.Ident &&
        completeGeneric.has(decoded(token).toLowerCase()),
    });
  };
  for (const segment of balanced.topLevelSegments()) {
    finish(segment.startIndex, segment.endIndex);
  }
  let result = families.filter((family) => family.value);
  if (opts.removeAfterKeyword) {
    const index = result.findIndex((family) => family.completeGeneric);
    if (index !== -1) result = result.slice(0, index + 1);
  }
  if (opts.removeDuplicates) {
    const seen = new Set();
    result = result.filter((item) => {
      if (item.folded === 'monospace') return true;
      if (seen.has(item.folded)) return false;
      seen.add(item.folded);
      return true;
    });
  }
  return result.map((family) => family.value).join(',');
}

export default minifyFamily;
