import cssnanoUtils from 'cssnano-utils';
import { decodedIdent } from './tokenUtils.js';

const { TokenType } = cssnanoUtils;
/** @typedef {import('./arena.js').ListMode} ListMode */

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
export function explicitCombinator(input, index) {
  const token = input[index];
  if (token?.[0] !== TokenType.Delim) return;
  if (token[1] === '>' || token[1] === '+' || token[1] === '~')
    return { value: token[1], end: index + 1 };
  if (
    token[1] === '|' &&
    input[index + 1]?.[0] === TokenType.Delim &&
    input[index + 1][1] === '|'
  )
    return { value: '||', end: index + 2 };
  if (
    token[1] === '/' &&
    decodedIdent(input[index + 1]) === 'deep' &&
    input[index + 2]?.[0] === TokenType.Delim &&
    input[index + 2][1] === '/'
  )
    return { value: '/deep/', end: index + 3 };
}

/** @param {ListMode} mode @param {readonly object[]} parts */
export function allowsLeadingCombinator(mode, parts) {
  return mode === 'relative' && parts.length === 0;
}

/** @param {ListMode} mode @param {readonly {kind:string}[]} parts */
export function violatesComplexMode(mode, parts) {
  return (
    parts.at(-1)?.kind === 'combinator' ||
    (mode === 'compound-only' &&
      parts.some(({ kind }) => kind === 'combinator'))
  );
}
