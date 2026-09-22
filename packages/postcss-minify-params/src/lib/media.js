import {
  decoded,
  significantIndex,
  TokenType,
  tokenEnd,
} from './token-utils.js';

/** @import cssnanoUtils from 'cssnano-utils' */
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */

/** @param {Tokens} input @param {{startIndex:number,endIndex:number}} segment @return {{endIndex:number,first:number,last:number}} */
function mediaSegmentInfo(input, { startIndex, endIndex }) {
  const first = significantIndex(input, startIndex, 1);
  let last = endIndex - 1;
  while (
    last >= first &&
    (input[last][0] === TokenType.Whitespace ||
      input[last][0] === TokenType.Comment)
  ) {
    last--;
  }
  return { endIndex, first, last };
}

/** @param {Tokens} input @param {{first:number,last:number}} segment @return {boolean} */
function isStandaloneAll(input, { first, last }) {
  return (
    first === last &&
    input[first]?.[0] === TokenType.Ident &&
    decoded(input[first]).toLowerCase() === 'all'
  );
}

/** @param {boolean} legacy @param {Tokens} input @param {{endIndex:number,first:number}} segment @param {{start:number,end:number,text:string}[]} changes @return {void} */
function minifyMediaAllSegment(legacy, input, { endIndex, first }, changes) {
  if (
    input[first]?.[0] !== TokenType.Ident ||
    decoded(input[first]).toLowerCase() !== 'all'
  )
    return;
  const second = significantIndex(input, first + 1, 1);
  const and =
    second < endIndex &&
    input[second]?.[0] === TokenType.Ident &&
    decoded(input[second]).toLowerCase() === 'and';
  if (legacy && !and) return;
  const end = and ? second : first;
  for (let i = first; i <= end; i++) {
    if (
      input[i][0] === TokenType.Ident ||
      input[i][0] === TokenType.Whitespace
    ) {
      changes.push({
        start: input[i][2],
        end: tokenEnd(input[i]),
        text: '',
      });
    }
  }
  const trailing = end + 1;
  if (trailing < endIndex && input[trailing]?.[0] === TokenType.Whitespace) {
    changes.push({
      start: input[trailing][2],
      end: tokenEnd(input[trailing]),
      text: '',
    });
  }
}

/** @param {boolean} legacy @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {{start:number,end:number,text:string}[]} changes @return {boolean} */
export default function minifyMediaAll(legacy, structure, changes) {
  const { tokens: input } = structure;
  const ranges = structure
    .topLevelSegments()
    .map((segment) => mediaSegmentInfo(input, segment));

  if (!legacy && ranges.some((segment) => isStandaloneAll(input, segment))) {
    const last = input.at(-1);
    if (last) changes.push({ start: 0, end: tokenEnd(last), text: '' });
    return true;
  }

  for (const segment of ranges)
    minifyMediaAllSegment(legacy, input, segment, changes);
  return false;
}
