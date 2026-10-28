import cssnanoUtils from '#utils';
import {
  aspectRatio,
  aspectRatioFeatures,
  calcProductEndTypes,
  calcProductStartTypes,
  closingTypes,
  decoded,
  featureValueIndex,
  mathFunctions,
  openingTypes,
  significantIndex,
  TokenType,
  whitespaceInsensitiveFunctions,
} from './tokenUtils.js';
import { numeric as numberToken } from '../../../values/tokenConstructors.js';
import { whitespace } from '../../../values/punctuationTokens.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from '../../../values/valueBuffer.js' */

const { numeric } = cssnanoUtils;
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */

/** @param {ReturnType<typeof cssnanoUtils.balancedTokens>} structure @return {(number|undefined)[]} */
export function parentIndexes(structure) {
  if (!structure) return [];
  const parents = [];
  const stack = [];
  for (let i = 0; i < structure.tokens.length; i++) {
    const type = structure.tokens[i][0];
    parents[i] = stack.at(-1);
    if (openingTypes.has(type)) stack.push(i);
    else if (closingTypes.has(type)) stack.pop();
  }
  return parents;
}

/** @param {Tokens} input @param {number} index @return {boolean} */
function isTightWhitespace(input, index) {
  const previous = input[index - 1];
  const next = input[index + 1];
  return [
    previous?.[0] === TokenType.Function,
    previous?.[0] === TokenType.OpenParen,
    next?.[0] === TokenType.CloseParen,
    previous?.[0] === TokenType.Comma,
    next?.[0] === TokenType.Comma,
    previous?.[0] === TokenType.Colon,
    next?.[0] === TokenType.Colon,
    previous?.[0] === TokenType.Delim,
    next?.[0] === TokenType.Delim,
  ].some(Boolean);
}

/** @param {unknown} token @return {boolean} */
function isAdditiveOperator(token) {
  return (
    Array.isArray(token) &&
    token[0] === TokenType.Delim &&
    (token[1] === '+' || token[1] === '-')
  );
}

/** @param {Tokens} input @param {number} index @param {(number|undefined)[]} parents @return {boolean} */
function isRequiredMathOperatorWhitespace(input, index, parents) {
  const previous = significantIndex(input, index - 1, -1);
  const next = significantIndex(input, index + 1, 1);
  const before = input[previous];
  const after = input[next];
  let operator;
  if (isAdditiveOperator(before)) operator = previous;
  else if (isAdditiveOperator(after)) operator = next;
  if (operator === undefined) return false;

  let parent = parents[index];
  while (parent !== undefined) {
    const token = input[parent];
    if (token?.[0] === TokenType.Function) {
      const name = String(decoded(token)).toLowerCase();
      if (whitespaceInsensitiveFunctions.has(name)) return false;
      if (!mathFunctions.has(name)) return true;
      break;
    }
    parent = parents[parent];
  }

  const left = input[significantIndex(input, operator - 1, -1)];
  const right = input[significantIndex(input, operator + 1, 1)];
  return (
    calcProductEndTypes.has(left?.[0]) && calcProductStartTypes.has(right?.[0])
  );
}

/** @param {Tokens} input @param {number} name @param {number} left @param {number} slash @param {number} right @param {number} after @param {number} close @return {boolean} */
function isAspectRatioFeature(input, name, left, slash, right, after, close) {
  const a = input[left] ? numeric(input[left]) : false;
  const b = input[right] ? numeric(input[right]) : false;
  const lowerName = String(decoded(input[name])).toLowerCase();
  return (
    aspectRatioFeatures.has(lowerName) &&
    input[slash]?.[0] === TokenType.Delim &&
    input[slash][1] === '/' &&
    input[left]?.[0] === TokenType.Number &&
    input[right]?.[0] === TokenType.Number &&
    a &&
    b &&
    !a.unit &&
    !b.unit &&
    after === close
  );
}

/**
 * The tokens that replace the whitespace token at `index`: none when the space
 * is tight, else one space.
 *
 * @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure
 * @param {number} index
 * @param {(number|undefined)[]} parents
 * @return {CSSToken[]}
 */
function whitespaceReplacement(structure, index, parents) {
  const input = structure.tokens;
  const next = input[index + 1];
  const tight = isTightWhitespace(input, index);
  const open = parents[index];
  const emptyCustomProperty =
    next?.[0] === TokenType.CloseParen &&
    open !== undefined &&
    featureValueIndex(input, open) === structure.endForOpening(open) &&
    decoded(input[significantIndex(input, open + 1, 1)]).startsWith('--');
  const tightened =
    tight &&
    !emptyCustomProperty &&
    !isRequiredMathOperatorWhitespace(input, index, parents);
  return tightened ? [] : [whitespace()];
}

/** @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {(number|undefined)[]} parents @param {TokenEdit[]} changes @return {void} */
export function minifyWhitespace(structure, parents, changes) {
  const { tokens: input } = structure;
  const edited = new Set(changes.map(({ start }) => start));
  for (let i = 0; i < input.length; i++) {
    if (input[i][0] !== TokenType.Whitespace || edited.has(i)) continue;
    const replacement = whitespaceReplacement(structure, i, parents);
    // A space that already spells its replacement is no edit, so the buffer keeps its text.
    const spelled = replacement.length === 0 ? '' : ' ';
    if (spelled === input[i][1]) continue;
    changes.push({ start: i, end: i + 1, tokens: replacement });
  }
}

/** @param {Tokens} input @param {(number|undefined)[]} parents @param {number} index @return {boolean} */
function isGroupingParent(input, parents, index) {
  let parent = parents[index];
  while (parent !== undefined) {
    if (input[parent][0] !== TokenType.OpenParen) return false;
    parent = parents[parent];
  }
  return true;
}

/** @param {boolean} supports @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {(number|undefined)[]} parents @param {TokenEdit[]} changes @return {void} */
export function minifyAspectRatios(supports, structure, parents, changes) {
  const { tokens: input } = structure;
  for (let open = 0; open < input.length; open++) {
    if (
      input[open][0] !== TokenType.OpenParen ||
      (supports
        ? !isGroupingParent(input, parents, open)
        : parents[open] !== undefined)
    )
      continue;
    const close = /** @type {number} */ (structure.endForOpening(open));
    const left = featureValueIndex(input, open);
    if (left < 0) continue;
    const name = significantIndex(input, open + 1, 1);
    const slash = significantIndex(input, left + 1, 1);
    const right = significantIndex(input, slash + 1, 1);
    const after = significantIndex(input, right + 1, 1);
    if (!isAspectRatioFeature(input, name, left, slash, right, after, close))
      continue;
    const a = numeric(input[left]);
    const b = numeric(input[right]);
    if (
      !a ||
      !b ||
      !Number.isFinite(a.number) ||
      a.number < 0 ||
      !Number.isFinite(b.number) ||
      b.number < 0 ||
      (a.number === 0 && b.number === 0)
    )
      continue;
    const ratio = aspectRatio(input[left][1], input[right][1]);
    if (!ratio) continue;
    const [x, y] = ratio;
    changes.push(
      { start: left, end: left + 1, tokens: [numberToken(String(x))] },
      { start: right, end: right + 1, tokens: [numberToken(String(y))] }
    );
  }
}
