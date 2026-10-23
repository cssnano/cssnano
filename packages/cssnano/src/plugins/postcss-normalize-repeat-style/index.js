import cssnanoUtils from '#utils';
import mappings from './lib/map.js';
import { ident } from '../../values/tokenConstructors.js';

const { TokenType, asciiLowerCase, decoded } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */
/** @typedef {{start: number, end: number, keyword: string}} KeywordPair */

const repeatPropertyRegex =
  /^(?:[bB][aA][cC][kK][gG][rR][oO][uU][nN][dD](?:-[rR][eE][pP][eE][aA][tT])?|(?:-[A-Za-z0-9_]+-)?[mM][aA][sS][kK]-[rR][eE][pP][eE][aA][tT])$/v;
const repeatKeywords = new Set(mappings.values());

const variableFunctions = new Set(['var', 'env', 'constant']);

/** @param {import('@csstools/css-tokenizer').TokenType} type */
function changesDepth(type) {
  if (
    type === TokenType.Function ||
    type === TokenType.OpenParen ||
    type === TokenType.OpenSquare ||
    type === TokenType.OpenCurly
  )
    return 1;
  if (
    type === TokenType.CloseParen ||
    type === TokenType.CloseSquare ||
    type === TokenType.CloseCurly
  )
    return -1;
  return 0;
}

/**
 * Splits the tokens into comma-separated layers at the top nesting depth. Each
 * layer lists the indexes of its repeat keywords, and whether a variable
 * function or a size separator stops the layer from being rewritten.
 * @param {readonly CSSToken[]} input
 * @return {{candidates: number[], stopped: boolean}[]}
 */
function repeatLayers(input) {
  let depth = 0;
  let stopped = false;
  /** @type {number[]} */ let candidates = [];
  /** @type {{candidates: number[], stopped: boolean}[]} */ const layers = [];
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    const type = token[0];
    if (
      depth === 0 &&
      type === TokenType.Function &&
      variableFunctions.has(asciiLowerCase(decoded(token)))
    ) {
      stopped = true;
      candidates = [];
    }
    depth += changesDepth(type);
    if (depth === 0 && type === TokenType.Comma) {
      layers.push({ candidates, stopped });
      candidates = [];
      stopped = false;
    } else if (depth === 0 && type === TokenType.Delim && token[1] === '/')
      stopped = true;
    else if (
      !stopped &&
      depth === 0 &&
      type === TokenType.Ident &&
      repeatKeywords.has(asciiLowerCase(decoded(token)))
    )
      candidates.push(index);
  }
  layers.push({ candidates, stopped });
  return layers;
}

/**
 * Whether only whitespace and comments stand between the two keyword tokens.
 * Any other token there is a component value that must survive the rewrite.
 * @param {readonly CSSToken[]} input
 * @param {number} first index of the first keyword
 * @param {number} second index of the second keyword
 * @return {boolean}
 */
function isInsignificantGap(input, first, second) {
  for (let index = first + 1; index < second; index++) {
    const type = input[index][0];
    if (type !== TokenType.Whitespace && type !== TokenType.Comment)
      return false;
  }
  return true;
}

/**
 * The rewrite of one layer, when it has exactly two keywords with nothing
 * significant between them.
 * @param {readonly CSSToken[]} input
 * @param {number[]} terms indexes of the layer's keywords
 * @return {KeywordPair | undefined}
 */
function repeatReplacement(input, terms) {
  if (terms.length !== 2) return undefined;
  const [first, second] = terms;
  if (!isInsignificantGap(input, first, second)) return undefined;
  const keyword = mappings.get(
    [decoded(input[first]), decoded(input[second])]
      .map(asciiLowerCase)
      .toString()
  );
  return keyword ? { start: first, end: second + 1, keyword } : undefined;
}

/**
 * The tokens of the value with each replaced pair turned into one keyword. The
 * pairs are ascending and do not overlap, so one forward pass builds the list.
 * @param {readonly CSSToken[]} input
 * @param {KeywordPair[]} pairs
 * @return {CSSToken[]}
 */
function joinKeywordPairs(input, pairs) {
  /** @type {CSSToken[]} */ const output = [];
  let cursor = 0;
  for (const { start, end, keyword } of pairs) {
    for (; cursor < start; cursor++) output.push(input[cursor]);
    output.push(ident(keyword));
    cursor = end;
  }
  for (; cursor < input.length; cursor++) output.push(input[cursor]);
  return output;
}

/** @type {Reducer} */
const reduce = (buffer) => {
  const input = buffer.tokens();
  // Two tokens cannot hold two keywords.
  if (input.length === 2) return;
  /** @type {KeywordPair[]} */
  const pairs = [];
  for (const { candidates, stopped } of repeatLayers(input)) {
    if (stopped) continue;
    const pair = repeatReplacement(input, candidates);
    if (pair) pairs.push(pair);
  }
  if (pairs.length > 0) {
    buffer.replace(0, input.length, joinKeywordPairs(input, pairs));
  }
};

/**
 * The stage for one run. It reads the background and mask repeat properties.
 *
 * @return {Stage}
 */
function repeatStage() {
  return {
    forProperty: (property) =>
      repeatPropertyRegex.test(property) ? reduce : null,
  };
}

/** @satisfies {StageEntry} */
const normalizeRepeatStyle = { create: () => repeatStage() };

export { normalizeRepeatStyle as default };
