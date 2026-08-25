import {
  tokenize,
  isTokenDimension,
  isTokenNumber,
  isTokenPercentage,
  isTokenIdent,
  isTokenDelim,
} from '@csstools/css-tokenizer';
import {
  parseListOfComponentValues,
  isTokenNode,
  isFunctionNode,
  isSimpleBlockNode,
} from '@csstools/css-parser-algorithms';
import getBrowsersList from '#getBrowsersList';
import convert from './lib/convert.js';

/** @import browserslist from 'browserslist' */

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

/**
 * Format a numeric value: drop leading zero, trim trailing zeros.
 *
 * @param {number} num
 * @return {string}
 */
function formatNumber(num) {
  let s = String(num);
  if (s.startsWith('0.')) {
    s = s.slice(1);
  } else if (s.startsWith('-0.')) {
    s = '-' + s.slice(2);
  }
  if (s.includes('.')) {
    s = s.replace(/\.?0+$/, '');
  }
  return s;
}

/**
 * Strip a leading dot from a unit string. postcss-value-parser produces
 * `.px` for `10.px`; csstools splits it into separate tokens, so we
 * handle this merge ourselves.
 *
 * @param {string} item
 * @return {string}
 */
function stripLeadingDot(item) {
  return item.charCodeAt(0) === '.'.charCodeAt(0) ? item.slice(1) : item;
}

/**
 * Extract the raw unit string from a token's representation. The
 * tokenizer decodes escape sequences in `token[4].unit` (e.g. `\9\0`
 * becomes a tab character), but the representation preserves them
 * verbatim.
 *
 * @param {string} repr
 * @return {string}
 */
function rawUnit(repr) {
  const match = repr.match(/^[+-]?(?:\d+\.?\d*|\d*\.\d+)/);
  return match ? repr.slice(match[0].length) : '';
}

/**
 * Build the replacement string for a zero-valued dimension/percentage.
 *
 * @param {string} unit - lowercased unit for comparison
 * @param {string} outputUnit - raw unit for output (preserves escapes)
 * @param {boolean} keepZeroUnit
 * @return {string}
 */
function formatZero(unit, outputUnit, keepZeroUnit) {
  let result =
    '0' +
    (keepZeroUnit || (!LENGTH_UNITS.has(unit) && unit !== '%')
      ? outputUnit
      : '');
  if (result === '0ms') {
    result = '0s';
  }
  return result;
}

/**
 * Process a dimension or percentage token node, mutating its repr in
 * place. Strips a leading `+` sign (the tokenizer records it in
 * `signCharacter`, but the numeric value is already signless).
 *
 * @param {import('@csstools/css-parser-algorithms').TokenNode} node
 * @param {string} outputUnit
 * @param {number} num
 * @param {Options} opts
 * @param {boolean} keepZeroUnit
 */
function processValue(node, outputUnit, num, opts, keepZeroUnit) {
  const lowerUnit = outputUnit.toLowerCase();

  if (node.value[1].charCodeAt(0) === '+'.charCodeAt(0)) {
    node.value[1] = node.value[1].slice(1);
  }

  if (num === 0) {
    node.value[1] = formatZero(lowerUnit, outputUnit, keepZeroUnit);
    return;
  }

  let newValue = convert(num, outputUnit, opts);

  if (
    typeof opts.precision === 'number' &&
    lowerUnit === 'px' &&
    node.value[1].includes('.')
  ) {
    const precision = Math.pow(10, opts.precision);
    newValue =
      Math.round(Number.parseFloat(newValue) * precision) / precision +
      outputUnit;
  }

  node.value[1] = newValue;
}

/**
 * Clamp opacity/shape-image-threshold to [0, 1] for bare numbers, or
 * [0, 100] for percentages. Re-reads the current representation so it
 * operates on the post-conversion value.
 *
 * @param {import('@csstools/css-parser-algorithms').TokenNode} node
 */
function clampOpacity(node) {
  const repr = node.value[1];
  const match = repr.match(/^[+-]?(?:\d+\.?\d*|\d*\.\d+)/);
  if (!match) return;
  const num = Number(match[0]);
  const unit = repr.slice(match[0].length);
  if (unit === '%') {
    if (num < 0) node.value[1] = '0%';
    return;
  }
  if (num > 1) {
    node.value[1] = '1' + unit;
  } else if (num < 0) {
    node.value[1] = '0' + unit;
  }
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

/**
 * Check whether a token node holds a dot delim.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue | undefined} node
 * @return {boolean}
 */
function isDotDelim(node) {
  return Boolean(
    node &&
    isTokenNode(node) &&
    isTokenDelim(node.value) &&
    node.value[1] === '.'
  );
}

/**
 * Try to merge a number token with a following dot + ident/`%`
 * pattern that csstools splits into separate tokens. Returns 2 when
 * a merge consumed both tokens, 0 otherwise.
 *
 * @param {import('@csstools/css-parser-algorithms').TokenNode} node
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} siblings
 * @param {number} index
 * @param {Options} opts
 * @param {boolean} keepZeroUnit
 * @param {boolean} isOpacityProp
 * @return {number} extra nodes consumed (0 or 2)
 */
function tryDotMerge(node, siblings, index, opts, keepZeroUnit, isOpacityProp) {
  const next = siblings[index + 1];
  const afterNext = siblings[index + 2];

  if (!isDotDelim(next) || !afterNext || !isTokenNode(afterNext)) return 0;

  if (isTokenIdent(afterNext.value)) {
    // number "." ident → dimension (e.g. 10.px → 10px)
    const num = Number(node.value[1]);
    const unit = stripLeadingDot(afterNext.value[4].value);
    processValue(node, unit, num, opts, keepZeroUnit);
    next.value[1] = '';
    afterNext.value[1] = '';
    if (isOpacityProp) clampOpacity(node);
    return 2;
  }

  if (isTokenDelim(afterNext.value) && afterNext.value[1] === '%') {
    // number "." "%" → percentage (e.g. 231.% → 231%)
    const num = Number(node.value[1]);
    processValue(node, '%', num, opts, keepZeroUnit);
    next.value[1] = '';
    afterNext.value[1] = '';
    if (isOpacityProp && num < 0) node.value[1] = '0%';
    return 2;
  }

  return 0;
}

/**
 * Format and clamp a bare number token: normalise -0, optimise
 * fractions, strip leading +, and clamp for opacity properties.
 *
 * @param {import('@csstools/css-parser-algorithms').TokenNode} node
 * @param {boolean} isOpacityProp
 */
function formatBareNumber(node, isOpacityProp) {
  const num = Number(node.value[1]);

  if (num === 0 && node.value[1].charCodeAt(0) === '-'.charCodeAt(0)) {
    node.value[1] = node.value[1].slice(1);
  }

  if (node.value[1].includes('.')) {
    if (!isOpacityProp || (num >= 0 && num <= 1)) {
      node.value[1] = formatNumber(num);
    }
  }

  if (node.value[4] && node.value[4].signCharacter === '+') {
    node.value[1] = formatNumber(num);
  }

  if (isOpacityProp) clampOpacity(node);
}

/**
 * Handle a number token that may be part of the `10.px`, `231.%`, or
 * `1.` patterns that csstools splits into separate tokens but
 * postcss-value-parser keeps as one word. Returns the number of
 * additional nodes consumed (0 or 1 for trailing dot, 2 for merge).
 *
 * @param {import('@csstools/css-parser-algorithms').TokenNode} node
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} siblings
 * @param {number} index
 * @param {Options} opts
 * @param {boolean} keepZeroUnit
 * @param {boolean} isOpacityProp
 * @return {number} extra nodes consumed
 */
function handleNumberToken(
  node,
  siblings,
  index,
  opts,
  keepZeroUnit,
  isOpacityProp
) {
  const merged = tryDotMerge(
    node,
    siblings,
    index,
    opts,
    keepZeroUnit,
    isOpacityProp
  );
  if (merged > 0) return merged;

  const next = siblings[index + 1];
  if (isDotDelim(next)) {
    // number "." → strip trailing dot (e.g. 1. → 1)
    next.value[1] = '';
    formatBareNumber(node, isOpacityProp);
    return 1;
  }

  formatBareNumber(node, isOpacityProp);
  return 0;
}

/**
 * Walk a list of component-value nodes, mutating dimension/percentage
 * tokens in place. Handles the split-token patterns that csstools
 * produces but postcss-value-parser keeps as single words.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @param {Options} opts
 * @param {boolean} keepZeroUnit
 * @param {boolean} isOpacityProp
 */
function walkAndTransform(nodes, opts, keepZeroUnit, isOpacityProp) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isFunctionNode(node)) {
      const name = node.getName().toLowerCase();
      if (name === 'url') continue;
      const innerKeep = keepZeroPercentAlways.has(name);
      // keepZeroPercentAlways functions (calc, min, max, …) suppress
      // opacity clamping: the original plugin passes false for them.
      walkAndTransform(
        node.value,
        opts,
        innerKeep || keepZeroUnit,
        !innerKeep && isOpacityProp
      );
      continue;
    }

    if (isSimpleBlockNode(node)) {
      walkAndTransform(node.value, opts, keepZeroUnit, isOpacityProp);
      continue;
    }

    if (!isTokenNode(node)) continue;

    if (isTokenNumber(node.value)) {
      i += handleNumberToken(node, nodes, i, opts, keepZeroUnit, isOpacityProp);
      continue;
    }

    if (isTokenDimension(node.value)) {
      const num = node.value[4].value;
      const unit = rawUnit(node.value[1]);
      processValue(node, unit, num, opts, keepZeroUnit);
      if (isOpacityProp) clampOpacity(node);
      continue;
    }

    if (isTokenPercentage(node.value)) {
      const num = node.value[4].value;
      processValue(node, '%', num, opts, keepZeroUnit);
      if (isOpacityProp && num < 0) node.value[1] = '0%';
      continue;
    }
  }
}

/**
 * @param {Options} opts
 * @param {string[]} browsers
 * @param {import('postcss').Declaration} decl
 * @return {void}
 */
function transform(opts, browsers, decl) {
  const lowerCasedProp = decl.prop.toLowerCase();
  if (
    lowerCasedProp.includes('flex') ||
    (lowerCasedProp.indexOf('--') === 0 && !opts.transformCustomProperties) ||
    notALength.has(lowerCasedProp)
  ) {
    return;
  }

  const keepZeroUnit = shouldKeepZeroUnit(decl, browsers);
  const isOpacityProp =
    lowerCasedProp === 'opacity' || lowerCasedProp === 'shape-image-threshold';

  const tokens = tokenize({ css: decl.value });
  const cvList = parseListOfComponentValues(tokens);

  walkAndTransform(cvList, opts, keepZeroUnit, isOpacityProp);

  decl.value = cvList.map((n) => n.toString()).join('');
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
