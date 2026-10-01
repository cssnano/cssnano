import cssnanoUtils from 'cssnano-utils';
import convert, {
  formatNumber,
  roundToPrecision,
  timeConv,
  angleConv,
  freqConv,
} from './convert.js';

const {
  TokenType,
  calcSumFunctions,
  closeForOpening,
  decoded,
  lengthUnits,
  mathFunctions,
  numericSource,
  tokens,
} = cssnanoUtils;

/* Functions in which a zero cannot lose its unit. Every math function qualifies
 * because `calc(0%)` and `calc(0)` differ in type; the rest are listed per
 * grammar, e.g. conic-gradient stops take an <angle-percentage>, which no
 * unitless zero represents, while linear-gradient stops take a
 * <length-percentage>, which it does. */
const functionsPreservingZeroUnits = new Set([
  ...mathFunctions,
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

const convertibleUnits = new Set([
  ...timeConv.keys(),
  ...angleConv.keys(),
  ...freqConv.keys(),
  'rad',
]);

/** @typedef {Parameters<typeof convert>[2]} ConvertOptions */
/** @typedef {{precision?: false | number, transformCustomProperties?: boolean} & ConvertOptions & { overrideBrowserslist?: string | string[] } & import('browserslist').Options} Options */
/** @typedef {{keepZeroPercent: boolean, keepZeroLength: boolean, clampAlpha: boolean, isAlpha: boolean, isFont: boolean}} ReplacementFlags */

/**
 * @param {string} unit
 * @param {string} lowerCasedUnit
 * @param {Options} opts
 * @param {boolean} keepZeroPercent
 * @param {boolean} keepZeroLength
 * @return {string}
 */
function formatZero(
  unit,
  lowerCasedUnit,
  opts,
  keepZeroPercent,
  keepZeroLength
) {
  if (convertibleUnits.has(lowerCasedUnit)) {
    return convert(0, unit, opts);
  }
  if (unit === '%') {
    return keepZeroPercent ? '0%' : '0';
  }
  if (lengthUnits.has(lowerCasedUnit)) {
    return keepZeroLength ? '0' + unit : '0';
  }
  return '0';
}

/** @param {number} number @param {string} unit @param {string} raw @param {Options} opts @param {boolean} keepZeroPercent @param {boolean} keepZeroLength @param {boolean} hasDecimal @return {string} */
function parseNumber(
  number,
  unit,
  raw,
  opts,
  keepZeroPercent,
  keepZeroLength,
  hasDecimal
) {
  if (raw.includes('\\')) return raw;
  const lowerCasedUnit = unit.toLowerCase();
  if (
    unit !== '' &&
    unit !== '%' &&
    !lengthUnits.has(lowerCasedUnit) &&
    !convertibleUnits.has(lowerCasedUnit)
  )
    return raw;
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
  const writtenAsInteger =
    unit === '' && !raw.includes('.') && !raw.toLowerCase().includes('e');
  const allowExponent = (opts.allowExponent ?? true) && !writtenAsInteger;
  return convert(num, unit, { ...opts, allowExponent });
}

/** @param {string} value @param {number} number @param {string} unit @param {Options} opts @param {boolean} [clamp] @return {string} */
function clampOpacity(value, number, unit, opts, clamp = true) {
  if (unit === '%') {
    if (clamp) {
      if (number >= 100) return '1';
      if (number <= 0) return '0';
    }
    let decimalNumber = Number((number / 100).toPrecision(15));
    if (typeof opts.precision === 'number' && opts.precision >= 0) {
      decimalNumber = roundToPrecision(decimalNumber, opts.precision);
    }
    const decimal = formatNumber(decimalNumber, opts.allowExponent ?? true);
    return decimal.length < value.length ? decimal : value;
  }
  if (clamp) {
    if (number > 1) return '1';
    if (number < 0) return '0';
  }
  return value;
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
 * @param {string} replacement
 * @param {string} raw
 * @param {boolean} isAlpha
 * @param {boolean} isConvertibleZero
 * @return {boolean}
 */
function shouldReplace(replacement, raw, isAlpha, isConvertibleZero) {
  if (replacement === raw) return false;
  if (replacement.length < raw.length) return true;
  return (isAlpha || isConvertibleZero) && replacement.length <= raw.length;
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

/** @typedef {{index: number, start: number, end: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */

/**
 * @param {NumericSource} source
 * @param {boolean} isLineHeight
 * @param {FrameStack} frames
 * @param {Options} opts
 * @param {ReplacementFlags} flags
 * @return {{start: number, end: number, text: string} | undefined}
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
    source.number === 0 && convertibleUnits.has(source.unit.toLowerCase());

  if (shouldReplace(replacement, source.raw, isAlpha, isConvertibleZero)) {
    return {
      start: source.start,
      end: source.end,
      text: replacement,
    };
  }
  return undefined;
}

/**
 * @param {string} value
 * @param {ReplacementFlags} flags
 * @param {Options} opts
 * @return {{start: number, end: number, text: string}[]}
 */
export function findReplacements(value, flags, opts) {
  /** @type {{start: number, end: number, text: string}[]} */
  const replacements = [];
  const frames = new FrameStack(flags.keepZeroPercent, flags.keepZeroLength);
  let afterFontSlash = false;

  const input = tokens(value, { unicodeRangesAllowed: true });
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

    const source = numericSource(input, index);
    if (!source) continue;
    index = source.index;

    const edit = processNumericToken(
      source,
      wasAfterFontSlash,
      frames,
      opts,
      flags
    );
    if (edit) replacements.push(edit);
  }
  return replacements;
}
