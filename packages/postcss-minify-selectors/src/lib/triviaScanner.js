import cssnanoUtils from 'cssnano-utils';
import {
  isCombinator,
  isColumnCombinator,
  isDeepBoundary,
} from './tokenUtils.js';

const { TokenType } = cssnanoUtils;

/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./foldToIs.js').Compound} Compound */

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {{ value: string, length: number } | undefined}
 */
export function checkCombinatorToken(tokens, index) {
  if (isColumnCombinator(tokens, index)) {
    return { value: '||', length: 2 };
  }
  if (isDeepBoundary(tokens, index)) {
    return { value: '/deep/', length: 3 };
  }
  const token = tokens[index];
  if (isCombinator(token)) {
    return { value: token[1], length: 1 };
  }
  return undefined;
}

/**
 * @param {{ output: (string | import('./foldToIs.js').FunctionResult)[] }} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @return {number}
 */
export function skipTriviaAfterCombinator(state, tokens, start, finish) {
  let index = start;
  while (index < finish) {
    const t = tokens[index];
    if (t[0] === TokenType.Whitespace) {
      index++;
    } else if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) state.output.push(t[1]);
      index++;
    } else {
      break;
    }
  }
  return index;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @return {{ cursor: number, hasOrdinaryComment: boolean, importantIndices: number[] }}
 */
export function scanTriviaSegment(tokens, start, finish) {
  let cursor = start;
  let hasOrdinaryComment = false;
  /** @type {number[]} */
  const importantIndices = [];
  while (cursor < finish) {
    const t = tokens[cursor];
    if (t[0] === TokenType.Whitespace) {
      cursor++;
    } else if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) {
        importantIndices.push(cursor);
      } else {
        hasOrdinaryComment = true;
      }
      cursor++;
    } else {
      break;
    }
  }
  return { cursor, hasOrdinaryComment, importantIndices };
}

/**
 * @param {{ output: (string | import('./foldToIs.js').FunctionResult)[] }} state
 * @param {readonly CSSToken[]} tokens
 * @param {number[]} importantIndices
 * @param {number} triviaStart
 */
export function appendImportantTrivia(
  state,
  tokens,
  importantIndices,
  triviaStart
) {
  if (importantIndices.length === 0) return;
  if (state.output.length > 0 && importantIndices[0] > triviaStart) {
    state.output.push(' ');
  }
  for (let i = 0; i < importantIndices.length; i++) {
    if (i > 0 && importantIndices[i] > importantIndices[i - 1] + 1) {
      state.output.push(' ');
    }
    state.output.push(tokens[importantIndices[i]][1]);
  }
}

/**
 * @param {{ output: (string | import('./foldToIs.js').FunctionResult)[] }} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @param {boolean} preserveLeading
 * @param {Compound[]} compounds
 * @param {() => Compound} emptyCompoundFactory
 * @return {{ index: number, leadingCombinator: string | undefined }}
 */
export function consumeLeading(
  state,
  tokens,
  start,
  finish,
  preserveLeading,
  compounds,
  emptyCompoundFactory
) {
  let index = start;
  /** @type {string[]} */
  const leadingImportantComments = [];
  while (index < finish) {
    const t = tokens[index];
    if (t[0] === TokenType.Whitespace) {
      index++;
    } else if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) leadingImportantComments.push(t[1]);
      index++;
    } else {
      break;
    }
  }

  let leadingCombinator;
  if (preserveLeading && index < finish) {
    if (isColumnCombinator(tokens, index)) {
      leadingCombinator = '||';
      index += 2;
    } else if (isCombinator(tokens[index])) {
      leadingCombinator = tokens[index][1];
      index += 1;
    }
    if (leadingCombinator) {
      if (leadingImportantComments.length > 0) {
        leadingCombinator =
          leadingImportantComments.join('') + leadingCombinator;
        leadingImportantComments.length = 0;
      }
      index = skipTriviaAfterCombinator(state, tokens, index, finish);
      compounds.push(emptyCompoundFactory());
    }
  }

  for (const c of leadingImportantComments) {
    state.output.push(c);
  }

  return { index, leadingCombinator };
}
