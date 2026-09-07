import cssnanoUtils from 'cssnano-utils';

const { TokenType } = cssnanoUtils;
const decoded = /** @type {typeof cssnanoUtils.decoded} */ (
  cssnanoUtils.decoded
);
const tokenEnd = /** @type {typeof cssnanoUtils.tokenEnd} */ (
  cssnanoUtils.tokenEnd
);

/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */

export { TokenType, decoded, tokenEnd };

export const openingTypes = new Set([
  TokenType.Function,
  TokenType.OpenParen,
  TokenType.OpenSquare,
  TokenType.OpenCurly,
]);
export const closingTypes = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);
export const calcProductEndTypes = new Set([
  TokenType.Number,
  TokenType.Percentage,
  TokenType.Dimension,
  TokenType.Ident,
  TokenType.CloseParen,
]);
export const calcProductStartTypes = new Set([
  TokenType.Number,
  TokenType.Percentage,
  TokenType.Dimension,
  TokenType.Ident,
  TokenType.Function,
  TokenType.OpenParen,
]);
export const mathFunctions = new Set([
  'calc',
  'min',
  'max',
  'clamp',
  'round',
  'mod',
  'rem',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  'abs',
  'sign',
]);
export const whitespaceInsensitiveFunctions = new Set(['selector']);
export const aspectRatioFeatures = new Set([
  'aspect-ratio',
  'min-aspect-ratio',
  'max-aspect-ratio',
  'device-aspect-ratio',
  'min-device-aspect-ratio',
  'max-device-aspect-ratio',
]);

/**
 * Convert a CSS number spelling to an exact rational number.
 *
 * @param {string} source
 * @return {[bigint, bigint] | undefined}
 */
function rational(source) {
  const match = source.match(
    /^[+]?((?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE]([+-]?\d+))?$/
  );
  if (!match) return undefined;
  const [, coefficient, exponent = '0'] = match;
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = `${whole}${fraction}`;
  let numerator = BigInt(digits);
  let denominator = 10n ** BigInt(fraction.length);
  if (numerator === 0n) return [0n, 1n];
  const power = BigInt(exponent);
  if (power > 10000n || power < -10000n) return undefined;
  if (power >= 0n) numerator *= 10n ** power;
  else denominator *= 10n ** -power;
  return [numerator, denominator];
}

/** @param {bigint} a @param {bigint} b @return {bigint} */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/**
 * @param {string} left
 * @param {string} right
 * @return {[string, string] | undefined}
 */
export function aspectRatio(left, right) {
  const a = rational(left);
  const b = rational(right);
  if (!a || !b) return undefined;
  const numerator = a[0] * b[1];
  const denominator = b[0] * a[1];
  if (numerator === 0n && denominator === 0n) return undefined;
  const divisor = gcd(numerator, denominator);
  const result = [String(numerator / divisor), String(denominator / divisor)];
  return result.join('/').length < left.length + right.length + 1
    ? /** @type {[string, string]} */ (result)
    : undefined;
}

/** @param {Tokens} input @param {number} index @param {number} step @return {number} */
export function significantIndex(input, index, step) {
  let cursor = index;
  while (
    input[cursor] &&
    (input[cursor][0] === TokenType.Whitespace ||
      input[cursor][0] === TokenType.Comment)
  ) {
    cursor += step;
  }
  return cursor;
}

/**
 * @param {string} source
 * @param {{start:number,end:number}[]} segments
 * @param {{start:number,end:number,text:string}[]} edits
 * @return {string[]}
 */
export function serializeSegments(source, segments, edits) {
  let segmentIndex = 0;
  let previousEnd = -1;
  let previousEdit;
  for (const edit of edits) {
    if (
      previousEdit &&
      edit.start === previousEdit.start &&
      edit.end === previousEdit.end &&
      edit.text === previousEdit.text
    ) {
      continue;
    }
    while (
      segmentIndex < segments.length &&
      edit.start >= segments[segmentIndex].end
    ) {
      segmentIndex++;
    }
    const segment = segments[segmentIndex];
    if (
      !segment ||
      edit.start < segment.start ||
      edit.start < previousEnd ||
      edit.end < edit.start ||
      edit.end > segment.end
    ) {
      return segments.map(({ start, end }) => source.slice(start, end));
    }
    previousEnd = edit.end;
    previousEdit = edit;
  }
  let editIndex = 0;
  return segments.map(({ start, end }) => {
    let cursor = start;
    let result = '';
    while (editIndex < edits.length && edits[editIndex].start < end) {
      const edit = edits[editIndex++];
      if (edit.start < start || edit.start < cursor) continue;
      result += source.slice(cursor, edit.start) + edit.text;
      cursor = edit.end;
    }
    result += source.slice(cursor, end);
    return result;
  });
}
