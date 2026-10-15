import cssnanoUtils from '#utils';
import {
  decoded,
  featureValueIndex,
  isWhitespaceOrComment,
  rational,
  significantIndex,
  TokenType,
  tokenEnd,
} from './tokenUtils.js';

const { asciiLowerCase } = cssnanoUtils;

/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} Structure */

/** @param {Tokens} input @param {{startIndex:number,endIndex:number}} segment @return {{endIndex:number,first:number,last:number}} */
function mediaSegmentInfo(input, { startIndex, endIndex }) {
  const first = significantIndex(input, startIndex, 1);
  let last = endIndex - 1;
  while (last >= first && isWhitespaceOrComment(input, last)) last--;
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

/** @param {boolean} legacy @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {{startIndex:number,endIndex:number}[]} segments @param {{start:number,end:number,text:string}[]} changes @return {boolean} */
export default function minifyMediaAll(legacy, structure, segments, changes) {
  const { tokens: input } = structure;
  const ranges = segments.map((segment) => mediaSegmentInfo(input, segment));

  if (!legacy && ranges.some((segment) => isStandaloneAll(input, segment))) {
    const last = input.at(-1);
    if (last) changes.push({ start: 0, end: tokenEnd(last), text: '' });
    return true;
  }

  for (const segment of ranges)
    minifyMediaAllSegment(legacy, input, segment, changes);
  return false;
}

/**
 * A parenthesized feature of a conjunction, and the `and` that joins it to the
 * feature before it. `and` is undefined only for a first feature with no media
 * type in front of it.
 *
 * @typedef {{open: number, close: number, and: number | undefined}} Feature
 */

/**
 * Whether a feature or media type has just ended, so the next token must be
 * an `and` or the query ends.
 *
 * @param {string} state
 * @param {boolean} hasMediaType
 * @return {boolean}
 */
function endsOperand(state, hasMediaType) {
  return state === 'joined' || (state === 'prefix' && hasMediaType);
}

/**
 * Splits a media query into its parenthesized features. Only a plain
 * conjunction qualifies: an optional `only`, one media type, then features
 * joined by `and`. A query with `or`, `not`, a function or anything else at
 * its top level returns undefined, because dropping a feature from it could
 * widen the query.
 *
 * @param {Structure} structure
 * @param {{startIndex: number, endIndex: number}} segment
 * @return {Feature[] | undefined}
 */
function conjunctionFeatures(structure, { startIndex, endIndex }) {
  const { tokens: input } = structure;
  /** @type {Feature[]} */
  const features = [];
  // `prefix` reads `only` and the media type, `joined` follows a feature and
  // `separated` follows an `and`.
  let state = 'prefix';
  let hasOnly = false;
  let hasMediaType = false;
  /** @type {number | undefined} */
  let and;
  for (let i = startIndex; i < endIndex; i++) {
    if (isWhitespaceOrComment(input, i)) continue;
    const [type] = input[i];
    if (type === TokenType.Ident) {
      const word = asciiLowerCase(decoded(input[i]));
      if (word === 'not' || word === 'or') return undefined;
      if (word === 'and') {
        if (endsOperand(state, hasMediaType)) {
          and = i;
          state = 'separated';
          continue;
        }
        return undefined;
      }
      if (state !== 'prefix') return undefined;
      if (word === 'only' && !hasOnly && !hasMediaType) {
        hasOnly = true;
        continue;
      }
      // `only` is a keyword, so it cannot be the media type.
      if (word === 'only' || hasMediaType) return undefined;
      hasMediaType = true;
    } else if (type === TokenType.OpenParen) {
      const close = /** @type {number} */ (structure.endForOpening(i));
      if (endsOperand(state, hasMediaType) || (state === 'prefix' && hasOnly))
        return undefined;
      features.push({
        open: i,
        close,
        and: state === 'separated' ? and : undefined,
      });
      state = 'joined';
      i = close;
    } else {
      return undefined;
    }
  }
  return state === 'separated' ? undefined : features;
}

/**
 * The feature's interchangeability key and exact bound, for a `min-*` or
 * `max-*` feature whose value is a dimension such as `(min-width:320px)`.
 * Other features, and values that are not exact in source form, return
 * undefined.
 *
 * @param {Structure} structure
 * @param {Feature} feature
 * @return {{key: string, atLeast: boolean, bound: [bigint, bigint]} | undefined}
 */
function rangeBound(structure, { open, close }) {
  const { tokens: input } = structure;
  const value = featureValueIndex(input, open);
  if (
    value < 0 ||
    input[value][0] !== TokenType.Dimension ||
    significantIndex(input, value + 1, 1) !== close
  )
    return undefined;
  const name = input[significantIndex(input, open + 1, 1)];
  const feature = asciiLowerCase(decoded(name));
  const atLeast = feature.startsWith('min-');
  if (!atLeast && !feature.startsWith('max-')) return undefined;
  // A dimension token always carries its unit, decoded, in the fifth slot.
  const { unit } = /** @type {{unit: string}} */ (input[value][4]);
  const source = input[value][1];
  if (!source.endsWith(unit)) return undefined;
  const number = source.slice(0, source.length - unit.length);
  // Exponent notation is invalid before CSS Syntax 3, so dropping a feature
  // that uses it would make an unapplied query apply.
  if (asciiLowerCase(number).includes('e')) return undefined;
  const bound = rational(number);
  if (!bound) return undefined;
  return {
    key: `${feature}|${asciiLowerCase(unit)}`,
    atLeast,
    bound,
  };
}

/**
 * Marks the features that another feature in the same conjunction already
 * implies. Two features with the same name and unit are compared: of several
 * `min-*` bounds the largest holds, of several `max-*` bounds the smallest.
 * Ties keep the first feature.
 *
 * @param {Structure} structure
 * @param {Feature[]} features
 * @return {boolean[]}
 */
function redundantFeatures(structure, features) {
  const removed = features.map(() => false);
  /** @type {Map<string, {index: number, bound: [bigint, bigint]}>} */
  const held = new Map();
  for (const [index, feature] of features.entries()) {
    const range = rangeBound(structure, feature);
    if (!range) continue;
    const current = held.get(range.key);
    if (!current) {
      held.set(range.key, { index, bound: range.bound });
      continue;
    }
    // Compare a/b with c/d by cross-multiplying, which keeps the result exact.
    const [a, b] = range.bound;
    const [c, d] = current.bound;
    const replaces = range.atLeast ? a * d > c * b : a * d < c * b;
    if (replaces) {
      removed[current.index] = true;
      held.set(range.key, { index, bound: range.bound });
    } else {
      removed[index] = true;
    }
  }
  return removed;
}

/**
 * The token range that removes the features from `first` through `last`
 * together with the `and` that joins each to its neighbour. A run that starts
 * the conjunction takes the `and` after it instead, which leaves the media
 * type and the `and` before the first feature untouched, so the range never
 * overlaps the `all and` that minifyMediaAll removes.
 *
 * @param {Tokens} input
 * @param {Feature[]} features
 * @param {number} first
 * @param {number} last
 * @return {{from: number, to: number}}
 */
function removalRange(input, features, first, last) {
  const { and, open } = features[first];
  if (first === 0 || and === undefined) {
    return { from: open, to: features[last + 1].open - 1 };
  }
  const from = significantIndex(input, and - 1, -1) + 1;
  return { from, to: features[last].close };
}

/**
 * Drops `min-*` and `max-*` features that another feature in the same
 * conjunction already implies, such as `(min-width:320px)` in
 * `(min-width:768px) and (min-width:320px)`. Only a plain `and`-joined
 * conjunction is changed, and only features with the same name and unit are
 * compared, so every other query stays byte-identical.
 *
 * Edits are added to `changes`. Their ranges never overlap the edits that
 * minifyMediaAll adds for the same query.
 *
 * @param {Structure} structure
 * @param {{startIndex: number, endIndex: number}[]} segments the top-level comma-separated queries
 * @param {{start: number, end: number, text: string}[]} changes
 * @return {void}
 */
export function dropRedundantRangeFeatures(structure, segments, changes) {
  const { tokens: input } = structure;
  for (const segment of segments) {
    const features = conjunctionFeatures(structure, segment);
    if (!features || features.length < 2) continue;
    const removed = redundantFeatures(structure, features);
    for (let first = 0; first < features.length; first++) {
      if (!removed[first]) continue;
      let last = first;
      while (last + 1 < features.length && removed[last + 1]) last++;
      const { from, to } = removalRange(input, features, first, last);
      first = last;
      for (let i = from; i <= to; i++) {
        changes.push({ start: input[i][2], end: tokenEnd(input[i]), text: '' });
      }
    }
  }
}
