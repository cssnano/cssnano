import { HashType, TokenType } from '@csstools/css-tokenizer';
import { openParen } from '../../../values/punctuationTokens.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from '../../../values/valueBuffer.js' */

/**
 * The whitespace after a token, and the character after that whitespace. A
 * `\9` that ends a token reads these, since they belong to the next token.
 * @typedef {{run: string, next: string}} HackTail
 */

const ieHackRegex = /(\\9)(\r\n|[ \t\n\r\f])?([ \t\n\r\f]*)/gv;
const hackAtEndRegex = /\\9(?:\r\n|[ \t\n\r\f])$/v;
const hexDigitRegex = /^[0-9a-fA-F]$/v;
// Whitespace before the end of the text or a delimiter separates nothing.
const separatedBy = new Set(['', '!', ',', ')', ';']);

/**
 * Whether a whitespace run that follows a hack is dropped before `next`.
 *
 * @param {string} next the character after the run
 * @return {boolean}
 */
function isSeparatedByDelimiter(next) {
  return separatedBy.has(next);
}

/**
 * Whether the token text ends with a `\9` escape and the space it folds in,
 * so the whitespace token after it is the run the hack removes.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
function endsWithHack(token) {
  return token[0] !== TokenType.String && hackAtEndRegex.test(token[1]);
}

/**
 * Whether the token text starts with a `\9` escape, so the whitespace token
 * before it is the run the hack removes.
 *
 * @param {CSSToken | undefined} token
 * @return {boolean}
 */
function startsWithHack(token) {
  return (
    token !== undefined &&
    token[0] !== TokenType.String &&
    token[1].startsWith('\\9')
  );
}

/**
 * The whitespace after a token and the first character of the text after it,
 * read from the tokens that follow `index`.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {HackTail}
 */
function hackTail(tokens, index) {
  const following = tokens[index + 1];
  if (following?.[0] !== TokenType.Whitespace) {
    return { run: '', next: following?.[1][0] ?? '' };
  }
  return {
    run: following[1],
    next: tokens[index + 2]?.[1][0] ?? '',
  };
}

/**
 * The text of one token with each IE hack in it unhacked. A space that a
 * `\9` escape folds in stays only before a hex digit, since dropping it would
 * join the digit to the escape. A `\9` at the end of the text reads `tail`,
 * and a whitespace run it leaves in `tail` is for the caller to edit.
 *
 * @param {string} text
 * @param {HackTail} tail
 * @return {string}
 */
function unhackTokenText(text, tail) {
  return text.replaceAll(
    ieHackRegex,
    (match, hack, folded = '', run, offset) => {
      const end = offset + match.length;
      const atEnd = end === text.length;
      const next = atEnd ? tail.next : (text[end] ?? '');
      const trailingRun = run || (atEnd ? tail.run : '');
      if (trailingRun && !isSeparatedByDelimiter(next)) {
        // The run keeps its separating space as a single space.
        return run ? `${hack}  ` : `${hack} `;
      }
      return hack + (folded && hexDigitRegex.test(next) ? folded : '');
    }
  );
}

/**
 * The type and data of the token that `previous` and a name read as once
 * nothing separates them, or undefined when `previous` ends before the name.
 * A token that ends in a name, a number, or a delimiter that starts a name
 * takes the name in.
 *
 * @param {CSSToken} previous
 * @param {string} name the decoded name that follows
 * @return {[TokenType, any] | undefined}
 */
function joinedName(previous, name) {
  const [type, text, , , data] = previous;
  switch (type) {
    case TokenType.Ident:
    case TokenType.AtKeyword:
    case TokenType.Hash:
      return [type, { ...data, value: data.value + name }];
    case TokenType.Dimension:
      return [type, { ...data, unit: data.unit + name }];
    case TokenType.Number:
      return [TokenType.Dimension, { ...data, unit: name }];
    case TokenType.Delim:
      if (text === '-') return [TokenType.Ident, { value: `-${name}` }];
      if (text === '#')
        return [TokenType.Hash, { value: name, type: HashType.ID }];
      if (text === '@') return [TokenType.AtKeyword, { value: name }];
      return undefined;
    default:
      return undefined;
  }
}

/**
 * The tokens that `previous` and a hack read as once the whitespace between
 * them goes, or undefined when they stay two tokens. The hack starts an
 * identifier, so the token before it may take it in. A hack that opens a
 * function stays a function only after an identifier; elsewhere its `(`
 * opens a group.
 *
 * @param {CSSToken} previous
 * @param {CSSToken} hack an identifier or function token that starts with `\9`
 * @return {CSSToken[] | undefined}
 */
function joinedHack(previous, hack) {
  const joined = joinedName(
    previous,
    /** @type {{value: string}} */ (hack[4]).value
  );
  if (joined === undefined) return undefined;
  const [type, data] = joined;
  const text = previous[1] + hack[1];
  if (hack[0] !== TokenType.Function) {
    return [/** @type {CSSToken} */ ([type, text, -1, -1, data])];
  }
  if (type === TokenType.Ident) {
    return [/** @type {CSSToken} */ ([TokenType.Function, text, -1, -1, data])];
  }
  return [
    /** @type {CSSToken} */ ([type, text.slice(0, -1), -1, -1, data]),
    openParen(),
  ];
}

/**
 * The token with the text given and the data kept. The text must read back
 * as the same token, such as a token whose escape loses a folded space.
 *
 * @param {CSSToken} token
 * @param {string} text
 * @return {CSSToken}
 */
function respelled(token, text) {
  return /** @type {CSSToken} */ ([token[0], text, -1, -1, token[4]]);
}

/**
 * @param {number} index
 * @param {CSSToken[]} tokens the tokens that replace the one at `index`
 * @return {TokenEdit}
 */
function replaceToken(index, tokens) {
  return { start: index, end: index + 1, tokens };
}

/**
 * Joins a hack to the token before the whitespace it drops, when the
 * tokenizer reads the two as one, so the token list matches the text. The
 * pending edits of that token and that whitespace become one edit.
 *
 * @param {TokenEdit[]} edits
 * @param {readonly CSSToken[]} tokens
 * @param {number} index the index of the hack
 * @param {CSSToken} hack the hack as it is written out
 * @return {boolean} whether the hack was joined
 */
function joinHack(edits, tokens, index, hack) {
  const deletion = edits.at(-1);
  if (deletion?.start !== index - 1 || deletion.tokens.length > 0) {
    return false;
  }
  const before = edits.at(-2);
  const rewritten = before?.end === index - 1 && before.tokens.length > 0;
  const previous = rewritten ? before.tokens.at(-1) : tokens[index - 2];
  const joined = previous && joinedHack(previous, hack);
  if (!joined) return false;
  edits.pop();
  if (!rewritten) {
    edits.push({ start: index - 2, end: index + 1, tokens: joined });
    return true;
  }
  edits.pop();
  edits.push({
    start: before.start,
    end: index + 1,
    tokens: [...before.tokens.slice(0, -1), ...joined],
  });
  return true;
}

/**
 * Pushes the edit that unhacks the token at `index`: the token respelled, or
 * joined to the token before the whitespace the hack drops.
 *
 * @param {TokenEdit[]} edits
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 */
function unhack(edits, tokens, index) {
  const token = tokens[index];
  const spelling = unhackTokenText(token[1], hackTail(tokens, index));
  const hack = spelling === token[1] ? token : respelled(token, spelling);
  const joined = startsWithHack(token) && joinHack(edits, tokens, index, hack);
  if (!joined && hack !== token) edits.push(replaceToken(index, [hack]));
}

export {
  endsWithHack,
  hackTail,
  isSeparatedByDelimiter,
  replaceToken,
  respelled,
  startsWithHack,
  unhack,
};
