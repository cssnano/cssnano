import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import {
  COUNTER_STYLE_RESERVED,
  CSS_WIDE_KEYWORDS,
  KEYFRAMES_SHORTHAND_KEYWORDS,
} from './grammar.js';
import { walkValue } from './valueWalk.js';

const { applyEdits, asciiLowerCase, decoded, tokens } = cssnanoUtils;

/**
 * @typedef {{ text: string, isString: boolean, absorbsWhitespace: boolean }} Replacement
 * @typedef {{ start: number, end: number, text: string }} Edit
 * @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken
 * @typedef {(token: CSSToken, frame: import('./valueWalk.js').NestingFrame | undefined, index: number) => Edit | undefined} Visitor
 */

/**
 * Prepares the spelling that references to a renamed name receive. A name
 * ending in an unterminated hex escape, e.g. `\61`, absorbs a following space
 * and would swallow the next component, so edits must know whether to
 * terminate it. A name that already includes its terminating space, or ends in
 * an escaped space, absorbs nothing.
 *
 * @param {{ isString: boolean, tokenText: string }} target the target's
 *   at-rule name
 * @return {Replacement}
 */
function createReplacement({ isString, tokenText }) {
  return {
    text: tokenText,
    isString,
    absorbsWhitespace:
      !isString && tokens(`${tokenText} `)[0][1].length > tokenText.length,
  };
}

/**
 * Whether a token already separates its neighbours, so a name placed next to
 * it cannot fuse with it. A hex escape or escaped space ending an ident does
 * not: its trailing space is part of that ident.
 *
 * @param {CSSToken | undefined} token
 * @return {boolean}
 */
function isSeparator(token) {
  return (
    token === undefined ||
    token[0] === TokenType.Whitespace ||
    token[0] === TokenType.Comment ||
    token[0] === TokenType.Comma
  );
}

/**
 * Whether a token starts with a code point that can continue an ident sequence
 * or turn it into a function token.
 *
 * @param {CSSToken | undefined} token
 * @return {boolean}
 */
function canContinueIdent(token) {
  if (!token) {
    return false;
  }
  const code = /** @type {number} */ (token[1].codePointAt(0));
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    code === 0x2d ||
    code === 0x5f ||
    code === 0x5c ||
    code === 0x28 ||
    code >= 0x80
  );
}

/**
 * Creates the edit replacing the name token at `index`, adding a space only
 * where the tokens next to it would otherwise fuse with the new name: an
 * ident needs a separator that a string did not, e.g. `1s"a"` must not become
 * `1sb`, and a name ending in a hex escape absorbs the space after it.
 *
 * @param {CSSToken[]} tokenList
 * @param {number} index
 * @param {Replacement} replacement
 * @return {Edit}
 */
function createNameEdit(tokenList, index, replacement) {
  const token = tokenList[index];
  const start = token[2];
  const end = token[3] + 1;
  if (replacement.isString) {
    return { start, end, text: replacement.text };
  }
  const wasString = token[0] === TokenType.String;
  const before = wasString && !isSeparator(tokenList[index - 1]) ? ' ' : '';
  const next = tokenList[index + 1];
  let after = '';
  if (replacement.absorbsWhitespace) {
    if (next?.[0] === TokenType.Whitespace) {
      // The escape absorbs one whitespace, and CSS reads a CRLF as one newline.
      const isAbsorbed = next[1].length === 1 || next[1] === '\r\n';
      if (isAbsorbed && canContinueIdent(tokenList[index + 2])) {
        after = ' ';
      }
    } else if (canContinueIdent(next)) {
      after = '  ';
    }
  } else if ((wasString || token[1].endsWith(' ')) && !isSeparator(next)) {
    after = ' ';
  }
  return {
    start,
    end,
    text: `${before}${replacement.text}${after}`,
  };
}

/**
 * @param {'animation-shorthand' | 'animation-name'} kind
 * @param {Map<string, Replacement>} renames
 * @param {CSSToken[]} tokenList
 * @return {Visitor}
 */
function createAnimationVisitor(kind, renames, tokenList) {
  return (token, frame, index) => {
    // Only top-level tokens name an animation; function arguments belong to
    // other grammar productions.
    if (frame) {
      return undefined;
    }
    if (token[0] === TokenType.String) {
      const rep = renames.get(/** @type {{value: string}} */ (token[4]).value);
      return rep && createNameEdit(tokenList, index, rep);
    }
    if (token[0] !== TokenType.Ident) {
      return undefined;
    }
    const val = decoded(token);
    const lower = asciiLowerCase(val);
    const isReserved =
      kind === 'animation-shorthand'
        ? KEYFRAMES_SHORTHAND_KEYWORDS.has(lower) || val.startsWith('--')
        : CSS_WIDE_KEYWORDS.has(lower) || lower === 'none';
    const rep = isReserved ? undefined : renames.get(val);
    return rep && createNameEdit(tokenList, index, rep);
  };
}

/**
 * Resolves a counter-style identifier token, returning a replacement edit if renamed.
 *
 * @param {CSSToken[]} tokenList
 * @param {number} index
 * @param {Map<string, Replacement>} renames
 * @return {Edit | undefined}
 */
function resolveCounterStyleToken(tokenList, index, renames) {
  const val = decoded(tokenList[index]);
  if (COUNTER_STYLE_RESERVED.has(asciiLowerCase(val))) {
    return undefined;
  }
  const rep = renames.get(val);
  return rep && createNameEdit(tokenList, index, rep);
}

/**
 * @param {CSSToken[]} tokenList
 * @param {Map<string, Replacement>} renames
 * @return {Visitor}
 */
function createCounterStyleVisitor(tokenList, renames) {
  return (token, frame, index) =>
    frame || token[0] !== TokenType.Ident
      ? undefined
      : resolveCounterStyleToken(tokenList, index, renames);
}

/**
 * @param {CSSToken[]} tokenList
 * @param {Map<string, Replacement>} renames
 * @return {Visitor}
 */
function createCounterFuncVisitor(tokenList, renames) {
  return (token, frame, index) => {
    // Only the counter-style-name argument slots of the recognized counter
    // functions name a counter style.
    if (
      token[0] !== TokenType.Ident ||
      !frame?.expectedArgs?.includes(frame.argIndex)
    ) {
      return undefined;
    }
    return resolveCounterStyleToken(tokenList, index, renames);
  };
}

/**
 * Rewrites the names a declaration references. An ident and a string with the
 * same value are one name, and a renamed name is rewritten wherever it is
 * referenced because only interchangeable names are ever renamed.
 *
 * @param {import('postcss').Declaration} decl
 * @param {NonNullable<ReturnType<typeof import('./grammar.js').classifyDeclaration>>['kind']} kind
 * @param {Map<string, Replacement>} renames old name → replacement
 * @param {string} value the declaration value, with the whitespace that a
 *   trailing escape consumed restored
 * @return {void}
 */
function rewriteDeclaration(decl, kind, renames, value) {
  const tokenList = tokens(value);

  /** @type {Visitor} */
  let visit;
  if (kind === 'animation-shorthand' || kind === 'animation-name') {
    visit = createAnimationVisitor(kind, renames, tokenList);
  } else if (kind === 'counter-style') {
    visit = createCounterStyleVisitor(tokenList, renames);
  } else {
    visit = createCounterFuncVisitor(tokenList, renames);
  }

  const edits = walkValue(tokenList, visit);

  if (edits.length > 0) {
    const result = applyEdits(value, edits);
    if (result !== value) {
      decl.value = result;
      if (decl.raws?.value?.raw) {
        decl.raws.value = { raw: result, value: result };
      }
    }
  }
}

export { createReplacement, rewriteDeclaration };
