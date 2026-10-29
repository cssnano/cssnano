import { joinRanges } from '../../../values/joinRanges.js';
import { comma } from '../../../values/punctuationTokens.js';
import { tokensText } from '../../../values/tokensText.js';
import minifyMediaAll, { dropRedundantRangeFeatures } from './media.js';
import {
  minifyAspectRatios,
  minifyWhitespace,
  parentIndexes,
} from './whitespace.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../values/joinRanges.js' */
/** @import {TokenEdit, ValueBuffer} from '../../../values/valueBuffer.js' */

/** @typedef {NonNullable<ReturnType<ValueBuffer['structure']>>} BalancedTokens */

/**
 * Orders the edits by token index. An edit that repeats or overlaps an earlier
 * one is dropped, so each token is edited at most once.
 *
 * @param {TokenEdit[]} changes
 * @return {TokenEdit[]}
 */
function orderedEdits(changes) {
  changes.sort((a, b) => a.start - b.start);
  /** @type {TokenEdit[]} */
  const edits = [];
  let end = 0;
  for (const edit of changes) {
    if (edit.start < end) continue;
    edits.push(edit);
    end = edit.end;
  }
  return edits;
}

/**
 * The text of the tokens from `start` up to `end`, exclusive.
 *
 * @param {readonly CSSToken[]} list
 * @param {number} start
 * @param {number} end
 * @return {string}
 */
function rangeText(list, start, end) {
  let text = '';
  for (let index = start; index < end; index++) text += list[index][1];
  return text;
}

/**
 * The queries of a prelude as pieces of its token list, one for each distinct
 * text, in UTF-16 order. Each query's text is built once.
 *
 * @param {readonly CSSToken[]} list
 * @param {{startIndex: number, endIndex: number}[]} queries
 * @return {RangePiece[]}
 */
function sortedQueryPieces(list, queries) {
  /** @type {Map<string, RangePiece>} */
  const pieces = new Map();
  for (const { startIndex, endIndex } of queries) {
    const key = rangeText(list, startIndex, endIndex);
    if (!pieces.has(key)) {
      pieces.set(key, { list, start: startIndex, end: endIndex });
    }
  }
  return [...pieces.keys()]
    .toSorted()
    .map((key) => /** @type {RangePiece} */ (pieces.get(key)));
}

/**
 * Minifies the prelude of an `@media` or `@supports` rule, as token edits on
 * its buffer. A prelude whose brackets do not balance is left as it was
 * written, and a prelude that is unchanged is not edited.
 *
 * @param {boolean} legacy
 * @param {'media' | 'supports'} ruleName the lowercase name of the rule
 * @param {ValueBuffer} buffer the prelude as written
 * @return {void}
 */
export default function reduceParams(legacy, ruleName, buffer) {
  const structure = buffer.structure();
  if (!structure) return;
  /** @type {TokenEdit[]} */
  const changes = [];
  const ancestry = parentIndexes(structure);
  // One walk over the top-level queries, shared by every pass below.
  const queries = structure.topLevelSegments();
  const mediaIsUnconditional =
    ruleName === 'media' && minifyMediaAll(legacy, structure, queries, changes);
  if (mediaIsUnconditional) {
    buffer.replaceRanges([
      { start: 0, end: structure.tokens.length, tokens: [] },
    ]);
    return;
  }
  if (ruleName === 'media')
    dropRedundantRangeFeatures(structure, queries, changes);
  minifyWhitespace(structure, ancestry, changes);
  minifyAspectRatios(ruleName === 'supports', structure, ancestry, changes);
  if (changes.length > 0) buffer.replaceRanges(orderedEdits(changes));
  // The edits keep the brackets balanced, so the queries are split from the
  // edited tokens.
  const edited = /** @type {BalancedTokens} */ (buffer.structure());
  const { tokens: list } = edited;
  const segments = edited.topLevelSegments();
  // One query that spans the prelude has nothing to sort or join, so its text stays as it is.
  if (
    segments.length === 1 &&
    segments[0].startIndex === 0 &&
    segments[0].endIndex === list.length
  )
    return;
  const joined = joinRanges(sortedQueryPieces(list, segments), [comma()]);
  if (tokensText(joined) !== buffer.text()) {
    buffer.replaceRanges([{ start: 0, end: list.length, tokens: joined }]);
  }
}
