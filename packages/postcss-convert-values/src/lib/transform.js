import cssnanoUtils from 'cssnano-utils';
import convert from './convert.js';
import { closeForOpening, syntaxAllowsPercentage } from './parse-syntax.js';

const {
  TokenType,
  applyEdits,
  decoded,
  lengthUnits,
  mathFunctions,
  numericSource,
  tokens,
} = cssnanoUtils;

const notALength = new Set([
  'descent-override',
  'ascent-override',
  'font-stretch',
  'size-adjust',
  'line-gap-override',
]);
const flexProperties = new Set([
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'flex-basic',
  '-webkit-flex',
  '-webkit-flex-grow',
  '-webkit-flex-shrink',
  '-webkit-flex-basis',
  '-webkit-box-flex',
  '-ms-flex',
  '-ms-flex-order',
  '-ms-flex-positive',
  '-ms-flex-negative',
  '-ms-flex-preferred-size',
]);
const alphaProperties = new Set([
  'opacity',
  'shape-image-threshold',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
]);
const zeroUnitRetention = {
  always: new Set(['stroke-dashoffset', 'stroke-width', 'line-height']),
  ie11Percent: new Set(['max-height', 'height', 'min-width']),
  keyframePercent: new Set(['border-image-width', 'stroke-dasharray']),
};
/* Functions in which a zero cannot lose its unit. Every math function qualifies
 * because `calc(0%)` and `calc(0)` differ in type; the rest are listed per
 * grammar, e.g. conic-gradient stops take an <angle-percentage>, which no
 * unitless zero represents, while linear-gradient stops take a
 * <length-percentage>, which it does. */
const keepZeroPercentAlways = new Set([
  ...mathFunctions,
  'color-mix',
  'hsl',
  'hsla',
  'hwb',
  'linear',
  'conic-gradient',
  'repeating-conic-gradient',
  'cross-fade',
]);
const NUMBER_PREFIX = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

/** @typedef {Parameters<typeof convert>[2]} ConvertOptions */
/** @typedef {{precision?: false | number, transformCustomProperties?: boolean} & ConvertOptions & { overrideBrowserslist?: string | string[] } & import('browserslist').Options} Options */

/** @param {number} number @param {string} unit @param {string} raw @param {Options} opts @param {boolean} keepZeroUnit @param {boolean} hasDecimal @return {string} */
function parseNumber(number, unit, raw, opts, keepZeroUnit, hasDecimal) {
  const lowerCasedUnit = unit.toLowerCase();
  if (
    unit !== '' &&
    unit !== '%' &&
    !lengthUnits.has(lowerCasedUnit) &&
    !['s', 'ms', 'turn', 'deg'].includes(lowerCasedUnit)
  )
    return raw;
  let num = number;
  if (
    typeof opts.precision === 'number' &&
    lowerCasedUnit === 'px' &&
    hasDecimal
  ) {
    const precision = Math.pow(10, opts.precision);
    num = Math.round(num * precision) / precision;
  }
  if (num === 0) {
    let result =
      0 +
      (keepZeroUnit || (!lengthUnits.has(lowerCasedUnit) && unit !== '%')
        ? unit
        : '');
    if (result === '0ms') result = '0s';
    return result;
  }
  return convert(num, unit, opts);
}

/** @param {string} value @param {number} number @param {string} unit @return {string} */
function clampOpacity(value, number, unit) {
  if (number > 1) return unit === '%' ? number + unit : 1 + unit;
  if (number < 0) return 0 + unit;
  return value;
}

/** @param {import('postcss').Declaration} decl @param {string[]} browsers @return {boolean} */
function shouldKeepZeroUnit(decl, browsers) {
  const { parent } = decl;
  const lowerCasedProp = decl.prop.toLowerCase();
  return (
    (decl.value.includes('%') &&
      zeroUnitRetention.ie11Percent.has(lowerCasedProp) &&
      browsers.includes('ie 11')) ||
    (zeroUnitRetention.keyframePercent.has(lowerCasedProp) &&
      parent?.parent?.type === 'atrule' &&
      /** @type {import('postcss').AtRule} */ (
        parent.parent
      ).name.toLowerCase() === 'keyframes') ||
    (lowerCasedProp === 'initial-value' &&
      parent?.type === 'atrule' &&
      parent.name === 'property' &&
      parent.nodes?.some(
        (node) =>
          node.type === 'decl' &&
          node.prop.toLowerCase() === 'syntax' &&
          syntaxAllowsPercentage(node.value)
      )) ||
    zeroUnitRetention.always.has(lowerCasedProp)
  );
}

/** @param {string} property @param {Options} opts @return {boolean} */
function skipsTransformation(property, opts) {
  return (
    flexProperties.has(property) ||
    (property.startsWith('--') && !opts.transformCustomProperties) ||
    notALength.has(property)
  );
}

/** @param {string} property @param {string} replacement @param {number} number @param {string} unit @param {boolean} isTopLevel @return {string} */
function clampPropertyOpacity(property, replacement, number, unit, isTopLevel) {
  return alphaProperties.has(property) && isTopLevel
    ? clampOpacity(replacement, number, unit)
    : replacement;
}

/** @param {{close: string | undefined, keepUnits: boolean, skipped: boolean}[]} frames @param {ReturnType<typeof tokens>[number]} token @return {boolean} */
function updateFrames(frames, token) {
  const type = token[0];
  if (type === TokenType.Function) {
    const name = decoded(token).toLowerCase();
    const parent = frames.at(-1);
    frames.push({
      close: TokenType.CloseParen,
      keepUnits: Boolean(parent?.keepUnits) || keepZeroPercentAlways.has(name),
      skipped: Boolean(parent?.skipped) || name === 'url',
    });
    return true;
  }
  if (
    type === TokenType.OpenParen ||
    type === TokenType.OpenSquare ||
    type === TokenType.OpenCurly
  ) {
    const parent = frames.at(-1);
    frames.push({
      close: closeForOpening(type),
      keepUnits: Boolean(parent?.keepUnits),
      skipped: Boolean(parent?.skipped),
    });
    return true;
  }
  if (
    type === TokenType.CloseParen ||
    type === TokenType.CloseSquare ||
    type === TokenType.CloseCurly
  ) {
    const frame = frames.at(-1);
    if (frame?.close === type) frames.pop();
    return true;
  }
  return false;
}

/** @param {Options} opts @param {string[]} browsers @param {import('postcss').Declaration} decl @return {void} */
export default function transform(opts, browsers, decl) {
  const lowerCasedProp = decl.prop.toLowerCase();
  if (skipsTransformation(lowerCasedProp, opts)) return;
  const raw = decl.raws.value;
  const rawValue = raw?.value === decl.value ? raw.raw : undefined;
  const value = rawValue ?? decl.value;
  /** @type {{start: number, end: number, text: string}[]} */
  const replacements = [];
  /** @type {{close: string | undefined, keepUnits: boolean, skipped: boolean}[]} */
  const frames = [
    {
      close: undefined,
      keepUnits: shouldKeepZeroUnit(decl, browsers),
      skipped: false,
    },
  ];
  const input = tokens(value);
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (updateFrames(frames, token)) continue;
    if (frames.at(-1)?.skipped) continue;
    const source = numericSource(input, index);
    if (!source) continue;
    index = source.index;
    const rawNumber = source.raw.match(NUMBER_PREFIX);
    const unit = rawNumber
      ? source.raw.slice(rawNumber[0].length)
      : source.unit;
    const converted = parseNumber(
      source.number,
      unit,
      source.raw,
      opts,
      frames.at(-1)?.keepUnits ?? false,
      source.hasDecimal
    );
    const replacement = clampPropertyOpacity(
      lowerCasedProp,
      converted,
      source.number,
      unit,
      frames.length === 1
    );
    if (replacement !== source.raw)
      replacements.push({
        start: source.start,
        end: source.end,
        text: replacement,
      });
  }
  if (replacements.length) {
    const result = applyEdits(value, replacements);
    decl.value = result;
    if (decl.raws?.value?.raw) decl.raws.value = { raw: result, value: result };
  }
}
