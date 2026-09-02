import getBrowsersList from '#getBrowsersList';
import cssnanoUtils from 'cssnano-utils';
import convert from './lib/convert.js';

/** @import browserslist from 'browserslist' */

const { TokenType, applyEdits, decoded, numericSource, tokens } = cssnanoUtils;

const LENGTH_UNITS = new Set([
  'em',
  'ex',
  'ch',
  'rem',
  'vw',
  'vh',
  'vmin',
  'vmax',
  'cm',
  'mm',
  'q',
  'in',
  'pt',
  'pc',
  'px',
]);

// These properties only accept percentages, so no point in trying to transform
const notALength = new Set([
  'descent-override',
  'ascent-override',
  'font-stretch',
  'size-adjust',
  'line-gap-override',
]);

// Can't change the unit on these properties when they're 0
const keepWhenZero = new Set([
  'stroke-dashoffset',
  'stroke-width',
  'line-height',
]);

// Can't remove the % on these properties when they're 0 on IE 11
const keepZeroPercentOnIE11 = new Set(['max-height', 'height', 'min-width']);

const keepZeroPercentAlways = new Set([
  'calc',
  'color-mix',
  'min',
  'max',
  'clamp',
  'hsl',
  'hsla',
  'hwb',
  'linear',
]);

const keepZeroPercentageInKeyframe = new Set([
  'border-image-width',
  'stroke-dasharray',
]);

const NUMBER_PREFIX = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

/**
 * @param {number} number
 * @param {string} unit
 * @param {string} raw
 * @param {Options} opts
 * @param {boolean} keepZeroUnit
 * @param {boolean} hasDecimal
 * @return {string}
 */
function parseNumber(number, unit, raw, opts, keepZeroUnit, hasDecimal) {
  const lowerCasedUnit = unit.toLowerCase();
  if (
    unit !== '' &&
    unit !== '%' &&
    !LENGTH_UNITS.has(lowerCasedUnit) &&
    !['s', 'ms', 'turn', 'deg'].includes(lowerCasedUnit)
  ) {
    return raw;
  }

  if (number === 0) {
    let result =
      0 +
      (keepZeroUnit || (!LENGTH_UNITS.has(lowerCasedUnit) && unit !== '%')
        ? unit
        : '');
    if (result === '0ms') {
      result = '0s';
    }
    return result;
  }

  let result = convert(number, unit, opts);

  if (
    typeof opts.precision === 'number' &&
    lowerCasedUnit === 'px' &&
    hasDecimal
  ) {
    const precision = Math.pow(10, opts.precision);
    result =
      Math.round(Number.parseFloat(result) * precision) / precision + unit;
  }
  return result;
}

/**
 * @param {string} value
 * @param {number} number
 * @param {string} unit
 * @return {string}
 */
function clampOpacity(value, number, unit) {
  if (number > 1) {
    return unit === '%' ? number + unit : 1 + unit;
  } else if (number < 0) {
    return 0 + unit;
  }
  return value;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string[]} browsers
 * @return {boolean}
 */
function shouldKeepZeroUnit(decl, browsers) {
  const { parent } = decl;
  const lowerCasedProp = decl.prop.toLowerCase();

  return (
    (decl.value.includes('%') &&
      keepZeroPercentOnIE11.has(lowerCasedProp) &&
      browsers.includes('ie 11')) ||
    (keepZeroPercentageInKeyframe.has(lowerCasedProp) &&
      parent &&
      parent.parent &&
      parent.parent.type === 'atrule' &&
      /** @type {import('postcss').AtRule} */
      (parent.parent).name.toLowerCase() === 'keyframes') ||
    (lowerCasedProp === 'initial-value' &&
      parent &&
      parent.type === 'atrule' &&
      parent.name === 'property' &&
      parent.nodes !== undefined &&
      parent.nodes.some(
        (node) =>
          node.type === 'decl' &&
          node.prop.toLowerCase() === 'syntax' &&
          (node.value === "'<percentage>'" ||
            node.value === '"<percentage>"' ||
            node.value === "'<length-percentage>'" ||
            node.value === '"<length-percentage>"')
      )) ||
    keepWhenZero.has(lowerCasedProp)
  );
}

/** @param {string} property @param {Options} opts @return {boolean} */
function skipsTransformation(property, opts) {
  return (
    property.includes('flex') ||
    (property.startsWith('--') && !opts.transformCustomProperties) ||
    notALength.has(property)
  );
}

/** @param {string} property @param {string} replacement @param {number} number @param {string} unit @return {string} */
function clampPropertyOpacity(property, replacement, number, unit) {
  return property === 'opacity' || property === 'shape-image-threshold'
    ? clampOpacity(replacement, number, unit)
    : replacement;
}

const closingTokens = new Map([
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

/**
 * @param {typeof TokenType.OpenParen | typeof TokenType.OpenSquare | typeof TokenType.OpenCurly} type
 * @return {typeof TokenType.CloseParen | typeof TokenType.CloseSquare | typeof TokenType.CloseCurly}
 */
function closeForOpening(type) {
  const close = closingTokens.get(type);
  if (close === undefined) {
    throw new Error(`Unknown opening token: ${type}`);
  }
  return /** @type {typeof TokenType.CloseParen | typeof TokenType.CloseSquare | typeof TokenType.CloseCurly} */ (
    close
  );
}

/**
 * @param {{close: string | undefined, keepUnits: boolean, skipped: boolean}[]} frames
 * @param {ReturnType<typeof tokens>[number]} token
 * @return {boolean}
 */
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

/**
 * @param {Options} opts
 * @param {string[]} browsers
 * @param {import('postcss').Declaration} decl
 * @return {void}
 */
function transform(opts, browsers, decl) {
  const lowerCasedProp = decl.prop.toLowerCase();
  if (skipsTransformation(lowerCasedProp, opts)) {
    return;
  }

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
    if (frames.at(-1)?.skipped) {
      continue;
    }

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
      unit
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
    if (rawValue !== undefined) {
      decl.raws.value = { raw: result, value: result };
    }
  }
}

const plugin = 'postcss-convert-values';

/**
 * @typedef {Parameters<typeof convert>[2]} ConvertOptions
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{precision?: false | number, transformCustomProperties?: boolean} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = { precision: false }) {
  return {
    postcssPlugin: plugin,

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(opts, stats, from, file, env);

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls((decl) =>
            transform(/** @type {Options} */ (opts), browsers, decl)
          );
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
