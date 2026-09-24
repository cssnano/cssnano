import cssnanoUtils from 'cssnano-utils';
import convert, {
  dropLeadingZero,
  roundToPrecision,
  timeConv,
  angleConv,
  freqConv,
} from './convert.js';
import { syntaxAllowsPercentage } from './parse-syntax.js';

const {
  TokenType,
  applyEdits,
  calcSumFunctions,
  closeForOpening,
  decoded,
  lengthUnits,
  mathFunctions,
  numericSource,
  tokens,
} = cssnanoUtils;

const flexBasisProperties = new Set([
  'flex',
  'flex-basis',
  'flex-basic',
  'flex-preferred-size',
]);
const alphaProperties = new Set([
  'opacity',
  'shape-image-threshold',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
  'flood-opacity',
]);
const zeroPercentRetention = new Set([
  'descent-override',
  'ascent-override',
  'font-stretch',
  'font-width',
  'size-adjust',
  'line-gap-override',
  'text-size-adjust',
  'subscript-position-override',
  'superscript-position-override',
  'subscript-size-override',
  'superscript-size-override',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-width',
]);
const zeroUnitRetention = {
  ie11Percent: new Set(['max-height', 'height', 'min-width']),
  keyframePercent: new Set([
    'border-image-width',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
  ]),
};
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
  return convert(num, unit, opts);
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
    const decimal = dropLeadingZero(decimalNumber);
    return decimal.length < value.length ? decimal : value;
  }
  if (clamp) {
    if (number > 1) return '1';
    if (number < 0) return '0';
  }
  return value;
}

/** @param {string} str @return {string} */
function stripVendorPrefix(str) {
  if (str.charCodeAt(0) !== 45 /* '-' */) return str;
  if (str.startsWith('-webkit-')) return str.slice(8);
  if (str.startsWith('-moz-')) return str.slice(5);
  if (str.startsWith('-ms-')) return str.slice(4);
  if (str.startsWith('-o-')) return str.slice(3);
  return str;
}

/** @type {WeakMap<import('postcss').AtRule, boolean>} */
const atPropertySyntaxCache = new WeakMap();

/** @param {import('postcss').AtRule} parent @return {boolean} */
function atPropertyAllowsPercentage(parent) {
  const cached = atPropertySyntaxCache.get(parent);
  if (cached !== undefined) return cached;

  const syntaxDecl = /** @type {import('postcss').Declaration | undefined} */ (
    parent.nodes?.find(
      (node) => node.type === 'decl' && node.prop.toLowerCase() === 'syntax'
    )
  );
  const result = syntaxDecl ? syntaxAllowsPercentage(syntaxDecl.value) : true;
  atPropertySyntaxCache.set(parent, result);
  return result;
}

/** @param {import('postcss').Declaration} decl @return {boolean} */
function isInsideKeyframes(decl) {
  let current = decl.parent;
  while (current && current.type !== 'root') {
    if (
      current.type === 'atrule' &&
      /** @type {import('postcss').AtRule} */ (current).name
        .toLowerCase()
        .endsWith('keyframes')
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** @param {string} property @param {Options} opts @return {boolean} */
function skipsTransformation(property, opts) {
  return property.startsWith('--') && !opts.transformCustomProperties;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} lowerCasedProp
 * @param {string} strippedProp
 * @param {boolean | string[]} supportsIE
 * @return {{keepZeroPercent: boolean, keepZeroLength: boolean, hasParentContext: boolean, clampAlpha: boolean}}
 */
function getDeclarationFlags(decl, lowerCasedProp, strippedProp, supportsIE) {
  const isLineHeight = strippedProp === 'line-height';
  const isFlexBasis = flexBasisProperties.has(strippedProp);
  const isAtProperty =
    lowerCasedProp === 'initial-value' &&
    decl.parent?.type === 'atrule' &&
    /** @type {import('postcss').AtRule} */ (decl.parent).name.toLowerCase() ===
      'property';
  const isAlphaProp = alphaProperties.has(strippedProp);
  const isKeyframeProp = zeroUnitRetention.keyframePercent.has(strippedProp);
  const inKeyframes =
    (isKeyframeProp || isAlphaProp) && isInsideKeyframes(decl);
  const hasParentContext = lowerCasedProp === 'initial-value' || inKeyframes;

  const hasIESupport =
    typeof supportsIE === 'boolean'
      ? supportsIE
      : supportsIE.some((b) => b.startsWith('ie '));

  const keepZeroPercent =
    isLineHeight ||
    isFlexBasis ||
    zeroPercentRetention.has(strippedProp) ||
    (hasIESupport && zeroUnitRetention.ie11Percent.has(strippedProp)) ||
    (inKeyframes && isKeyframeProp) ||
    (isAtProperty &&
      atPropertyAllowsPercentage(
        /** @type {import('postcss').AtRule} */ (decl.parent)
      ));

  const keepZeroLength =
    isLineHeight ||
    isFlexBasis ||
    strippedProp === 'columns' ||
    strippedProp === 'flex-order' ||
    isAtProperty;

  const clampAlpha = !inKeyframes;

  return { keepZeroPercent, keepZeroLength, hasParentContext, clampAlpha };
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
 * @param {string} strippedProp
 * @param {FrameStack} frames
 * @param {Options} opts
 * @param {boolean} clampAlpha
 * @return {{start: number, end: number, text: string} | undefined}
 */
function processNumericToken(
  source,
  isLineHeight,
  strippedProp,
  frames,
  opts,
  clampAlpha
) {
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
  const isAlpha = alphaProperties.has(strippedProp) && frames.isTopLevel;
  const replacement = isAlpha
    ? clampOpacity(converted, source.number, source.unit, opts, clampAlpha)
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
 * @param {string} strippedProp
 * @param {{keepZeroPercent: boolean, keepZeroLength: boolean, clampAlpha: boolean}} flags
 * @param {Options} opts
 * @return {{start: number, end: number, text: string}[]}
 */
function findReplacements(value, strippedProp, flags, opts) {
  /** @type {{start: number, end: number, text: string}[]} */
  const replacements = [];
  const frames = new FrameStack(flags.keepZeroPercent, flags.keepZeroLength);
  const isFont = strippedProp === 'font';
  let afterFontSlash = false;

  const input = tokens(value);
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
      if (isFont && type === TokenType.Delim && token[1] === '/') {
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
      strippedProp,
      frames,
      opts,
      flags.clampAlpha
    );
    if (edit) replacements.push(edit);
  }
  return replacements;
}

/** @param {import('postcss').Declaration} decl @param {string} newValue @return {void} */
function updateDeclValue(decl, newValue) {
  decl.value = newValue;
  if (decl.raws?.value?.raw) {
    decl.raws.value = { raw: newValue, value: newValue };
  } else if (decl.raws?.value) {
    delete decl.raws.value;
  }
}

/** @param {import('postcss').Declaration} decl @return {string} */
function getRawOrDeclarationValue(decl) {
  const raw = decl.raws?.value;
  return raw?.raw && raw.value === decl.value ? raw.raw : decl.value;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} newValue
 * @param {string} originalValue
 * @return {void}
 */
function syncDeclValue(decl, newValue, originalValue) {
  const isStale = Boolean(
    decl.raws?.value && decl.raws.value.value !== decl.value
  );
  if (newValue !== originalValue || isStale) {
    updateDeclValue(decl, newValue);
  }
}

/** @param {Options} opts @param {boolean | string[]} supportsIE @param {import('postcss').Declaration} decl @param {Map<string, string>} [cache] @return {void} */
export default function transform(opts, supportsIE, decl, cache) {
  const lowerCasedProp = decl.prop.toLowerCase();
  if (skipsTransformation(lowerCasedProp, opts)) return;
  const value = getRawOrDeclarationValue(decl);
  if (!/[0-9]/v.test(value)) return;

  const strippedProp = stripVendorPrefix(lowerCasedProp);
  const flags = getDeclarationFlags(
    decl,
    lowerCasedProp,
    strippedProp,
    supportsIE
  );

  const cacheKey = flags.hasParentContext
    ? undefined
    : `${lowerCasedProp}:${value}`;
  if (cacheKey !== undefined && cache?.has(cacheKey)) {
    const cached = /** @type {string} */ (cache.get(cacheKey));
    syncDeclValue(decl, cached, value);
    return;
  }

  const replacements = findReplacements(value, strippedProp, flags, opts);
  const result = replacements.length ? applyEdits(value, replacements) : value;
  if (cacheKey !== undefined) {
    cache?.set(cacheKey, result);
  }
  syncDeclValue(decl, result, value);
}
