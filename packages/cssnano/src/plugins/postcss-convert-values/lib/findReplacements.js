import cssnanoUtils from '#utils';
import convert, {
  formatNumber,
  requiresZeroUnit,
  roundToPrecision,
  spelledLength,
} from './convert.js';
import { keepJoiningSign } from './keepJoiningSign.js';
import { numericSource } from './numericSource.js';
import { numeric as numericToken } from '../../../values/tokenConstructors.js';

const {
  TokenType,
  calcSumFunctions,
  closeForOpening,
  decoded,
  lengthUnits,
  mathFunctions,
  tokens,
} = cssnanoUtils;

/* Functions in which a zero cannot lose its unit. Every math function qualifies
 * because `calc(0%)` and `calc(0)` differ in type; the rest are listed per
 * grammar, e.g. conic-gradient stops take an <angle-percentage>, which no
 * unitless zero represents, while linear-gradient stops take a
 * <length-percentage>, which it does. */
const functionsPreservingZeroUnits = new Set([
  ...mathFunctions.keys(),
  ...calcSumFunctions,
  'anchor',
  'anchor-size',
  'contrast-color',
  'view',
  'color-mix',
  'hsl',
  'hsla',
  'hwb',
  'linear',
  'conic-gradient',
  'repeating-conic-gradient',
  'cross-fade',
  'rgb',
  'rgba',
  'oklch',
  'oklab',
  'lab',
  'lch',
  'color',
  'palette-mix',
]);

/** @typedef {Parameters<typeof convert>[2]} ConvertOptions */
/** @typedef {{precision?: false | number, transformCustomProperties?: boolean} & ConvertOptions} Options */
/** @typedef {import('./convert.js').Spelling} Spelling */
/** @typedef {ReturnType<typeof tokens>[number]} CSSToken */
/** @typedef {{keepZeroPercent: boolean, keepZeroLength: boolean, clampAlpha: boolean, isAlpha: boolean, isFont: boolean, isCustomProperty: boolean}} ReplacementFlags */

/* Only `unicode-range` and custom properties keep `U+` ranges as one token. */
const unicodeRangeOptions = { unicodeRangesAllowed: true };

/**
 * A custom property with a `U+` range may be read as `unicode-range` or as
 * anything else, and `u+1.0e2` is a range then a number in one, a single
 * number in the other, so no edit is safe for both.
 *
 * @param {string} value
 * @return {boolean}
 */
export function containsUnicodeRange(value) {
  if (!/u\+/iv.test(value)) return false;
  return tokens(value, unicodeRangeOptions).some(
    (token) => token[0] === TokenType.UnicodeRange
  );
}

/**
 * @param {string} unit
 * @param {string} lowerCasedUnit
 * @param {Options} opts
 * @param {boolean} keepZeroPercent
 * @param {boolean} keepZeroLength
 * @return {Spelling}
 */
function formatZero(
  unit,
  lowerCasedUnit,
  opts,
  keepZeroPercent,
  keepZeroLength
) {
  if (requiresZeroUnit(lowerCasedUnit)) {
    return convert(0, unit, opts);
  }
  if (unit === '%') {
    return { representation: '0', unit: keepZeroPercent ? '%' : '' };
  }
  if (lengthUnits.has(lowerCasedUnit)) {
    return { representation: '0', unit: keepZeroLength ? unit : '' };
  }
  return { representation: '0', unit: '' };
}

/** @param {number} number @param {string} unit @param {string} raw @param {Options} opts @param {boolean} keepZeroPercent @param {boolean} keepZeroLength @param {boolean} hasDecimal @return {Spelling} */
function parseNumber(
  number,
  unit,
  raw,
  opts,
  keepZeroPercent,
  keepZeroLength,
  hasDecimal
) {
  if (raw.includes('\\')) return { representation: raw, unit: '' };
  const lowerCasedUnit = unit.toLowerCase();
  if (
    unit !== '' &&
    unit !== '%' &&
    !lengthUnits.has(lowerCasedUnit) &&
    !requiresZeroUnit(lowerCasedUnit)
  )
    return { representation: raw, unit: '' };
  // A value that overflows to Infinity has no CSS spelling, so it stays as written.
  if (!Number.isFinite(number)) return { representation: raw, unit: '' };
  let num = number;
  if (
    typeof opts.precision === 'number' &&
    opts.precision >= 0 &&
    (hasDecimal || !Number.isInteger(num))
  ) {
    num = roundToPrecision(num, opts.precision);
  }
  if (num === 0) {
    return formatZero(
      unit,
      lowerCasedUnit,
      opts,
      keepZeroPercent,
      keepZeroLength
    );
  }
  // An exponent is never a valid <integer>, so a bare number written as an
  // integer may sit where only <integer> is allowed. Dimensions and numbers
  // already written as non-integers cannot.
  if (unit === '') {
    const writtenAsInteger =
      !raw.includes('.') && !raw.toLowerCase().includes('e');
    return { representation: formatNumber(num, !writtenAsInteger), unit: '' };
  }
  return convert(num, unit, opts);
}

/** @param {Spelling} spelling @param {number} number @param {string} unit @param {Options} opts @param {boolean} [clamp] @return {Spelling} */
function clampOpacity(spelling, number, unit, opts, clamp = true) {
  if (unit === '%') {
    if (clamp) {
      if (number >= 100) return { representation: '1', unit: '' };
      if (number <= 0) return { representation: '0', unit: '' };
    }
    let decimalNumber = Number((number / 100).toPrecision(15));
    if (typeof opts.precision === 'number' && opts.precision >= 0) {
      decimalNumber = roundToPrecision(decimalNumber, opts.precision);
    }
    const decimal = formatNumber(decimalNumber);
    return decimal.length < spelledLength(spelling)
      ? { representation: decimal, unit: '' }
      : spelling;
  }
  if (clamp) {
    if (number > 1) return { representation: '1', unit: '' };
    if (number < 0) return { representation: '0', unit: '' };
  }
  return spelling;
}

/** @param {string} str @return {string} */
export function stripVendorPrefix(str) {
  if (str.charCodeAt(0) !== 45 /* '-' */) return str;
  if (str.startsWith('-webkit-')) return str.slice(8);
  if (str.startsWith('-moz-')) return str.slice(5);
  if (str.startsWith('-ms-')) return str.slice(4);
  if (str.startsWith('-o-')) return str.slice(3);
  return str;
}

/**
 * @param {Spelling} replacement
 * @param {string} raw
 * @param {boolean} isAlpha
 * @param {boolean} isConvertibleZero
 * @return {boolean}
 */
function shouldReplace(replacement, raw, isAlpha, isConvertibleZero) {
  const length = spelledLength(replacement);
  if (
    length === raw.length &&
    replacement.representation + replacement.unit === raw
  ) {
    return false;
  }
  if (length < raw.length) return true;
  return (isAlpha || isConvertibleZero) && length <= raw.length;
}

class FrameStack {
  /** @type {string[]} */
  #closeStack = [];
  #keepZeroPercent;
  #keepZeroLength;
  #keepZeroUnitsDepth = -1;
  #skippedDepth = -1;

  /**
   * @param {boolean} keepZeroPercent
   * @param {boolean} keepZeroLength
   */
  constructor(keepZeroPercent, keepZeroLength) {
    this.#keepZeroPercent = keepZeroPercent;
    this.#keepZeroLength = keepZeroLength;
  }

  get isTopLevel() {
    return this.#closeStack.length === 0;
  }

  get isSkipped() {
    return this.#skippedDepth !== -1;
  }

  get keepZeroPercent() {
    return this.#keepZeroPercent || this.#keepZeroUnitsDepth !== -1;
  }

  get keepZeroLength() {
    return this.#keepZeroLength || this.#keepZeroUnitsDepth !== -1;
  }

  /**
   * @param {ReturnType<typeof tokens>[number]} token
   * @return {boolean}
   */
  advance(token) {
    const type = token[0];
    if (type === TokenType.Function) {
      const name = stripVendorPrefix(decoded(token).toLowerCase());
      const keepInFunction = functionsPreservingZeroUnits.has(name);
      const depth = this.#closeStack.length + 1;
      this.#closeStack.push(TokenType.CloseParen);
      if (keepInFunction && this.#keepZeroUnitsDepth === -1) {
        this.#keepZeroUnitsDepth = depth;
      }
      if (name === 'url' && this.#skippedDepth === -1) {
        this.#skippedDepth = depth;
      }
      return true;
    }
    if (
      type === TokenType.OpenParen ||
      type === TokenType.OpenSquare ||
      type === TokenType.OpenCurly
    ) {
      const close = closeForOpening(type);
      if (close !== undefined) this.#closeStack.push(close);
      return true;
    }
    if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.CloseCurly
    ) {
      if (
        this.#closeStack.length > 0 &&
        this.#closeStack[this.#closeStack.length - 1] === type
      ) {
        const depth = this.#closeStack.length;
        if (depth === this.#keepZeroUnitsDepth) this.#keepZeroUnitsDepth = -1;
        if (depth === this.#skippedDepth) this.#skippedDepth = -1;
        this.#closeStack.pop();
      }
      return true;
    }
    return false;
  }
}

/** @typedef {{index: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */

/**
 * @param {NumericSource} source
 * @param {boolean} isLineHeight
 * @param {FrameStack} frames
 * @param {Options} opts
 * @param {ReplacementFlags} flags
 * @return {Spelling | undefined} the new spelling, or undefined to keep the source
 */
function processNumericToken(source, isLineHeight, frames, opts, flags) {
  const currentKeepZeroPercent = frames.keepZeroPercent || isLineHeight;
  const currentKeepZeroLength = frames.keepZeroLength || isLineHeight;

  const converted = parseNumber(
    source.number,
    source.unit,
    source.raw,
    opts,
    currentKeepZeroPercent,
    currentKeepZeroLength,
    source.hasDecimal
  );
  const isAlpha = flags.isAlpha && frames.isTopLevel;
  const replacement = isAlpha
    ? clampOpacity(
        converted,
        source.number,
        source.unit,
        opts,
        flags.clampAlpha
      )
    : converted;
  const isConvertibleZero =
    source.number === 0 && requiresZeroUnit(source.unit.toLowerCase());

  return shouldReplace(replacement, source.raw, isAlpha, isConvertibleZero)
    ? replacement
    : undefined;
}

/**
 * The edits that shorten the numbers of a value, each replacing the tokens of
 * one number, sign included, with one token. Edits come in ascending order,
 * ready for ValueBuffer.replaceRanges.
 *
 * @param {readonly CSSToken[]} input the tokens of the value
 * @param {ReplacementFlags} flags
 * @param {Options} opts
 * @return {{start: number, end: number, tokens: CSSToken[]}[]}
 */
export function findReplacements(input, flags, opts) {
  /** @type {{start: number, end: number, tokens: CSSToken[]}[]} */
  const edits = [];
  const frames = new FrameStack(flags.keepZeroPercent, flags.keepZeroLength);
  let afterFontSlash = false;

  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (frames.advance(token)) {
      if (frames.isTopLevel && afterFontSlash) afterFontSlash = false;
      continue;
    }
    if (frames.isSkipped) continue;

    const type = token[0];
    if (frames.isTopLevel) {
      if (type === TokenType.Whitespace || type === TokenType.Comment) {
        continue;
      }
      if (flags.isFont && type === TokenType.Delim && token[1] === '/') {
        afterFontSlash = true;
        continue;
      }
    }

    const wasAfterFontSlash = frames.isTopLevel && afterFontSlash;
    if (afterFontSlash) afterFontSlash = false;

    if (
      type !== TokenType.Number &&
      type !== TokenType.Dimension &&
      type !== TokenType.Percentage
    ) {
      continue;
    }

    const previous = input[index - 1];
    const first = index;
    const source = numericSource(input, index);
    if (!source) continue;
    index = source.index;

    const spelling = processNumericToken(
      source,
      wasAfterFontSlash,
      frames,
      opts,
      flags
    );
    if (spelling) {
      const joined = keepJoiningSign(spelling, source, previous);
      edits.push({
        start: first,
        end: source.index + 1,
        tokens: [numericToken(joined.representation, joined.unit)],
      });
    }
  }
  return edits;
}
