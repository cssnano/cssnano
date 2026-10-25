import cssnanoUtils from '#utils';
import { func, ident } from '../../values/tokenConstructors.js';
import { closeParen } from '../../values/punctuationTokens.js';

const { TokenType, asciiLowerCase, decoded } = cssnanoUtils;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer} from '../../pipeline/host.js' */
/** @import {ValueBuffer} from '../../values/valueBuffer.js' */
/** @typedef {NonNullable<ReturnType<ValueBuffer['structure']>>} BalancedTokens */
const animationTransitionRegex =
  /^(?:-[A-Za-z0-9_]+-)?(?:[aA][nN][iI][mM][aA][tT][iI][oO][nN]|[tT][rR][aA][nN][sS][iI][tT][iI][oO][nN])(?:-[tT][iI][mM][iI][nN][gG]-[fF][uU][nN][cC][tT][iI][oO][nN])?$/v;

/* Works because toString() normalizes the formatting,
   so comparing the string forms behaves the same as number equality*/
const conversions = new Map([
  [[0.25, 0.1, 0.25, 1].toString(), 'ease'],
  [[0, 0, 1, 1].toString(), 'linear'],
  [[0.42, 0, 1, 1].toString(), 'ease-in'],
  [[0, 0, 0.58, 1].toString(), 'ease-out'],
  [[0.42, 0, 0.58, 1].toString(), 'ease-in-out'],
]);
/** @param {readonly CSSToken[]} input @param {{startIndex: number, endIndex: number}} segment @return {CSSToken | undefined} */
function singleToken(input, segment) {
  /** @type {CSSToken | undefined} */
  let result;
  for (let index = segment.startIndex; index < segment.endIndex; index++) {
    const token = input[index];
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment)
      continue;
    if (result) return;
    result = token;
  }
  return result;
}

/**
 * The tokens that replace a timing function, or null to keep it. A `steps()`
 * keeps the count token as written.
 *
 * @param {readonly CSSToken[]} input
 * @param {BalancedTokens} structure
 * @param {number} index the function token
 * @param {number} end the index of its `)`
 * @return {CSSToken[] | null}
 */
function reduceFunction(input, structure, index, end) {
  const name = asciiLowerCase(decoded(input[index]));
  const segments = structure.topLevelSegments(index + 1, end);
  if (name === 'cubic-bezier' && segments.length === 4) {
    const values = segments.map((segment) => {
      const token = singleToken(input, segment);
      return token?.[0] === TokenType.Number
        ? /** @type {{value: number}} */ (token[4]).value
        : Number.NaN;
    });
    if (!values.every((number) => !Number.isNaN(number))) return null;
    const keyword = conversions.get(values.toString());
    return keyword === undefined ? null : [ident(keyword)];
  }
  if (name !== 'steps' || segments.length !== 2) return null;
  const count = singleToken(input, segments[0]);
  if (
    !count ||
    count[0] !== TokenType.Number ||
    !Number.isInteger(/** @type {{value: number}} */ (count[4]).value) ||
    /** @type {{value: number}} */ (count[4]).value < 1
  )
    return null;
  const position = singleToken(input, segments[1]);
  if (!position || position[0] !== TokenType.Ident) return null;
  const positionName = asciiLowerCase(decoded(position));
  const countValue = /** @type {{value: number}} */ (count[4]).value;
  if (countValue === 1) {
    if (positionName === 'start' || positionName === 'jump-start')
      return [ident('step-start')];
    if (positionName === 'end' || positionName === 'jump-end')
      return [ident('step-end')];
  }
  return positionName === 'end' || positionName === 'jump-end'
    ? [func('steps'), count, closeParen()]
    : null;
}

/** @type {Reducer} */
const reduce = (buffer) => {
  const structure = buffer.structure();
  if (!structure) return;
  const { tokens: input } = structure;
  /** @type {{start: number, end: number, tokens: CSSToken[]}[]} */
  const edits = [];
  for (let index = 0; index < input.length; index++) {
    if (input[index][0] !== TokenType.Function) continue;
    const end = structure.endForOpening(index);
    if (end === undefined) continue;
    const replacement = reduceFunction(input, structure, index, end);
    if (replacement)
      edits.push({ start: index, end: end + 1, tokens: replacement });
  }
  buffer.replaceRanges(edits);
};

/**
 * The stage for one run. It reads the animation and transition properties,
 * including their vendor-prefixed forms.
 *
 * @return {import('../../pipeline/host.js').Stage}
 */
function timingStage() {
  return {
    forProperty: (property) =>
      animationTransitionRegex.test(property) ? reduce : null,
  };
}

/** @satisfies {import('../../pipeline/host.js').StageEntry} */
const normalizeTimingFunctions = { create: () => timingStage() };

export { normalizeTimingFunctions as default };
