import getBrowsersList from '#getBrowsersList';
import cssnanoUtils from 'cssnano-utils';
import convert from './lib/convert.js';

/** @import browserslist from 'browserslist' */

const { TokenType, applyEdits, decoded, lengthUnits, numericSource, tokens } =
  cssnanoUtils;

// These properties only accept percentages, so no point in trying to transform
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

// Properties whose 0 values must retain units under specific conditions
const zeroUnitRetention = {
  // Can't change the unit on these properties when they're 0
  always: new Set(['stroke-dashoffset', 'stroke-width', 'line-height']),
  // Can't remove the % on these properties when they're 0 on IE 11
  ie11Percent: new Set(['max-height', 'height', 'min-width']),
  // Keyframe percentages that cannot be converted to unitless zero
  keyframePercent: new Set(['border-image-width', 'stroke-dasharray']),
};

const keepZeroPercentAlways = new Set([
  'calc',
  'color-mix',
  'min',
  'max',
  'clamp',
  'round',
  'mod',
  'rem',
  'hypot',
  'abs',
  'sign',
  'sqrt',
  'pow',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'exp',
  'log',
  'hsl',
  'hsla',
  'hwb',
  'linear',
  'conic-gradient',
  'repeating-conic-gradient',
  'cross-fade',
]);

const percentageSyntaxTypes = new Set(['percentage', 'length-percentage']);

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
    !lengthUnits.has(lowerCasedUnit) &&
    !['s', 'ms', 'turn', 'deg'].includes(lowerCasedUnit)
  ) {
    return raw;
  }

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
    if (result === '0ms') {
      result = '0s';
    }
    return result;
  }

  return convert(num, unit, opts);
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
      zeroUnitRetention.ie11Percent.has(lowerCasedProp) &&
      browsers.includes('ie 11')) ||
    (zeroUnitRetention.keyframePercent.has(lowerCasedProp) &&
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

/**
 * @param {string} property
 * @param {string} replacement
 * @param {number} number
 * @param {string} unit
 * @param {boolean} isTopLevel
 * @return {string}
 */
function clampPropertyOpacity(property, replacement, number, unit, isTopLevel) {
  return alphaProperties.has(property) && isTopLevel
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
 * @param {ReturnType<typeof tokens>} input
 * @return {{containsPercentage: boolean, valid: boolean}}
 */
function parseSyntax(input) {
  let index = 0;
  let containsPercentage = false;
  /** @type {string[]} */
  const delimiters = [];

  /** @param {ReturnType<typeof tokens>[number] | undefined} token */
  const isTrivia = (token) =>
    token?.[0] === TokenType.Whitespace || token?.[0] === TokenType.Comment;

  const skipTrivia = () => {
    while (isTrivia(input[index])) index++;
  };

  /** @param {ReturnType<typeof tokens>[number] | undefined} token */
  const isClosing = (token) =>
    token?.[0] === TokenType.CloseParen ||
    token?.[0] === TokenType.CloseSquare ||
    token?.[0] === TokenType.CloseCurly;

  /** @param {ReturnType<typeof tokens>[number] | undefined} token */
  const isLiteral = (token) =>
    token?.[0] === TokenType.AtKeyword ||
    token?.[0] === TokenType.Dimension ||
    token?.[0] === TokenType.Hash ||
    token?.[0] === TokenType.Ident ||
    token?.[0] === TokenType.Number ||
    token?.[0] === TokenType.Percentage ||
    token?.[0] === TokenType.String ||
    token?.[0] === TokenType.URL ||
    token?.[0] === TokenType.UnicodeRange;

  /**
   * @param {number} start
   * @return {number}
   */
  const nextSignificant = (start) => {
    let cursor = start;
    while (isTrivia(input[cursor])) cursor++;
    return cursor;
  };

  /**
   * Consume a boolean combinator. A single `|` is valid; `&` must be paired.
   *
   * @return {boolean}
   */
  const consumeOperator = () => {
    const token = input[index];
    if (token?.[0] !== TokenType.Delim) return false;

    if (token[1] === '|') {
      index++;
      const next = nextSignificant(index);
      if (input[next]?.[0] === TokenType.Delim && input[next][1] === '|') {
        index = next + 1;
      }
      return true;
    }

    if (token[1] !== '&') return false;
    const next = nextSignificant(index + 1);
    if (input[next]?.[0] !== TokenType.Delim || input[next][1] !== '&') {
      return false;
    }
    index = next + 1;
    return true;
  };

  /**
   * @return {boolean}
   */
  const consumeRange = () => {
    index++;
    delimiters.push(TokenType.CloseSquare);
    let side = 0;
    let hasBound = false;
    let hasComma = false;

    while (index < input.length) {
      skipTrivia();
      const token = input[index];
      if (!token) return false;
      if (token[0] === TokenType.CloseSquare) {
        if (!hasComma || !hasBound || side !== 1) return false;
        delimiters.pop();
        index++;
        return true;
      }
      if (token[0] === TokenType.Comma) {
        if (hasComma || !hasBound) return false;
        hasComma = true;
        side++;
        hasBound = false;
        index++;
        continue;
      }
      if (
        token[0] === TokenType.Number ||
        token[0] === TokenType.Percentage ||
        token[0] === TokenType.Dimension ||
        token[0] === TokenType.Ident ||
        (token[0] === TokenType.Delim && (token[1] === '+' || token[1] === '-'))
      ) {
        hasBound = true;
        index++;
        continue;
      }
      return false;
    }
    return false;
  };

  /**
   * @return {boolean}
   */
  const consumeBoundedMultiplier = () => {
    const start = nextSignificant(index);
    if (input[start]?.[0] !== TokenType.OpenCurly) return false;

    let cursor = nextSignificant(start + 1);
    const minimum = input[cursor];
    if (minimum?.[0] !== TokenType.Number) return false;
    const minimumValue = /** @type {{value: number}} */ (minimum[4]);
    if (!Number.isInteger(minimumValue.value)) return false;
    cursor = nextSignificant(cursor + 1);
    if (input[cursor]?.[0] !== TokenType.Comma) return false;
    cursor = nextSignificant(cursor + 1);
    const maximum = input[cursor];
    if (maximum?.[0] !== TokenType.Number) return false;
    const maximumValue = /** @type {{value: number}} */ (maximum[4]);
    if (!Number.isInteger(maximumValue.value)) return false;
    cursor = nextSignificant(cursor + 1);
    if (input[cursor]?.[0] !== TokenType.CloseCurly) return false;
    index = cursor + 1;
    return true;
  };

  /**
   * @return {boolean}
   */
  const consumeMultiplier = () => {
    const start = nextSignificant(index);
    const token = input[start];
    if (
      token?.[0] === TokenType.Delim &&
      (token[1] === '?' ||
        token[1] === '*' ||
        token[1] === '+' ||
        token[1] === '#')
    ) {
      index = start + 1;
      return true;
    }
    return consumeBoundedMultiplier();
  };

  /**
   * @return {boolean}
   */
  const consumeComponent = () => {
    index++;
    skipTrivia();
    const name = input[index];
    if (name?.[0] !== TokenType.Ident) return false;
    const decodedName = decoded(name).toLowerCase();
    index++;
    skipTrivia();
    if (input[index]?.[0] === TokenType.OpenSquare && !consumeRange()) {
      return false;
    }
    skipTrivia();
    const close = input[index];
    if (close?.[0] !== TokenType.Delim || close[1] !== '>') return false;
    index++;
    if (percentageSyntaxTypes.has(decodedName)) containsPercentage = true;
    consumeMultiplier();
    return true;
  };

  /** @param {string | undefined} expectedClose @return {boolean} */
  const consumeSequence = (expectedClose) => {
    let hasTerm = false;
    let needsTerm = true;

    while (index < input.length) {
      skipTrivia();
      const token = input[index];
      if (!token) break;

      if (token[0] === expectedClose) {
        if (needsTerm || delimiters.at(-1) !== expectedClose) return false;
        delimiters.pop();
        index++;
        return true;
      }
      if (isClosing(token)) return false;

      if (needsTerm) {
        if (consumeOperator()) return false;
      } else if (consumeOperator()) {
        needsTerm = true;
        continue;
      }

      if (!consumeTerm()) return false;
      hasTerm = true;
      needsTerm = false;
    }

    return expectedClose === undefined && hasTerm && !needsTerm;
  };

  /**
   * @return {boolean}
   */
  const consumeTerm = () => {
    const token = input[index];
    if (!token) return false;
    if (token[0] === TokenType.Delim && token[1] === '<') {
      return consumeComponent();
    }
    if (
      token[0] === TokenType.Function ||
      token[0] === TokenType.OpenCurly ||
      (token[0] === TokenType.Delim &&
        ['?', '*', '+', '#', '&', '|'].includes(token[1]))
    ) {
      return false;
    }
    if (token[0] === TokenType.OpenParen || token[0] === TokenType.OpenSquare) {
      const close = closeForOpening(token[0]);
      delimiters.push(close);
      index++;
      if (!consumeSequence(close)) return false;
      consumeMultiplier();
      return true;
    }
    if (!isLiteral(token)) return false;
    index++;
    consumeMultiplier();
    return true;
  };

  const valid = consumeSequence(undefined);
  return { containsPercentage, valid };
}

/**
 * @param {string} value
 * @return {boolean}
 */
function syntaxAllowsPercentage(value) {
  const outerTokens = tokens(value);
  let syntaxToken;
  for (const token of outerTokens) {
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment) {
      continue;
    }
    if (syntaxToken || token[0] !== TokenType.String) return true;
    syntaxToken = token;
  }
  if (!syntaxToken) return true;

  const result = parseSyntax(tokens(decoded(syntaxToken)));
  return result.containsPercentage || !result.valid;
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
    if (decl.raws?.value?.raw) {
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
