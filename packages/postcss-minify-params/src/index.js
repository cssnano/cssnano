import getBrowsersList from '#getBrowsersList';
import cssnanoUtils from 'cssnano-utils';

const {
  TokenType,
  applyEdits,
  balancedTokens,
  decoded,
  numeric,
  tokenEnd,
  tokens,
} = cssnanoUtils;
/** @import browserslist from 'browserslist' */

/**
 * Return the greatest common divisor
 * of two numbers.
 *
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/**
 * @param {number} a
 * @param {number} b
 * @return {[number, number]}
 */
function aspectRatio(a, b) {
  const divisor = gcd(a, b);

  return [a / divisor, b / divisor];
}

/**
 * @param {string} args
 * @return {string}
 */
function split(args) {
  return args;
}

/**
 * @param {unknown[]} items
 * @return {string}
 */
function sortAndDedupe(items) {
  const a = [...new Set(items)];
  a.sort();
  return a.join();
}

/** @param {string} value @return {string[]} */
function splitTopLevel(value) {
  const structure = balancedTokens(value);
  if (!structure) return [value];
  const { tokens: input } = structure;
  return structure.topLevelSegments().map((segment) => {
    const start = input[segment.startIndex]?.[2] ?? value.length;
    const end =
      segment.endIndex > segment.startIndex
        ? tokenEnd(input[segment.endIndex - 1])
        : start;
    return value.slice(start, end);
  });
}

/** @param {ReturnType<typeof tokens>} input @param {number} index @param {number} step @return {number} */
function significantIndex(input, index, step) {
  let cursor = index;
  while (input[cursor] && input[cursor][0] === TokenType.Whitespace) {
    cursor += step;
  }
  return cursor;
}

/**
 * @param {boolean} legacy
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
// The media/supports grammar is handled as one token pass to preserve malformed input.
// eslint-disable-next-line complexity
function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase();

  // We should re-arrange parameters only for `@media` and `@supports` at-rules
  if (!rule.params || !['media', 'supports'].includes(ruleName)) {
    return;
  }

  const source = rule.params;
  const input = tokens(source);
  /** @type {{start:number,end:number,text:string}[]} */
  const changes = [];
  /** @type {Set<number>} Whitespace tokens ending empty custom-property fallbacks. */
  const customPropertySpaces = new Set();
  /** @type {{open:number, close:string, first?:number, colon?:number, hasValue:boolean}[]} */
  const stack = [];
  const closeFor = new Map([
    [TokenType.OpenParen, TokenType.CloseParen],
    [TokenType.OpenSquare, TokenType.CloseSquare],
    [TokenType.OpenCurly, TokenType.CloseCurly],
  ]);
  for (let i = 0; i < input.length; i++) {
    const token = input[i];
    const type = token[0];
    const parent = stack.at(-1);
    const close = closeFor.get(type);
    if (close) {
      stack.push({ open: i, close, hasValue: false });
    } else if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.CloseCurly
    ) {
      if (parent?.close === type) stack.pop();
    } else if (
      parent &&
      type !== TokenType.Whitespace &&
      type !== TokenType.Comment
    ) {
      if (parent.first === undefined) parent.first = i;
      else if (type === TokenType.Colon && parent.colon === undefined)
        parent.colon = i;
      else if (parent.colon !== undefined) parent.hasValue = true;
    }
    if (type === TokenType.Whitespace) {
      const previous = input[i - 1];
      const next = input[i + 1];
      const tight =
        previous?.[0] === TokenType.Function ||
        previous?.[0] === TokenType.OpenParen ||
        next?.[0] === TokenType.CloseParen ||
        previous?.[0] === TokenType.Comma ||
        next?.[0] === TokenType.Comma ||
        previous?.[0] === TokenType.Colon ||
        next?.[0] === TokenType.Colon ||
        previous?.[0] === TokenType.Delim ||
        next?.[0] === TokenType.Delim;
      if (
        next?.[0] === TokenType.CloseParen &&
        parent?.first !== undefined &&
        input[parent.first][0] === TokenType.Ident &&
        decoded(input[parent.first]).startsWith('--') &&
        parent.colon !== undefined &&
        !parent.hasValue
      )
        customPropertySpaces.add(i);
      changes.push({
        start: token[2],
        end: tokenEnd(token),
        text: tight && !customPropertySpaces.has(i) ? '' : ' ',
      });
    }
    if (
      type === TokenType.Ident &&
      decoded(token).toLowerCase().endsWith('-aspect-ratio')
    ) {
      const colon = significantIndex(input, i + 1, 1);
      const left = significantIndex(input, colon + 1, 1);
      const slash = significantIndex(input, left + 1, 1);
      const right = significantIndex(input, slash + 1, 1);
      const a = input[left] && numeric(input[left]);
      const b = input[right] && numeric(input[right]);
      if (
        input[colon]?.[0] === TokenType.Colon &&
        input[slash]?.[0] === TokenType.Delim &&
        input[slash][1] === '/' &&
        a &&
        b &&
        !a.unit &&
        !b.unit
      ) {
        const [x, y] = aspectRatio(a.number, b.number);
        changes.push(
          {
            start: input[left][2],
            end: tokenEnd(input[left]),
            text: String(x),
          },
          {
            start: input[right][2],
            end: tokenEnd(input[right]),
            text: String(y),
          }
        );
      }
    }
  }
  let normalized = applyEdits(source, changes);
  if (rule.name.toLowerCase() === 'media') {
    const mediaTokens = tokens(normalized);
    const first = mediaTokens.find(
      (token) => token[0] !== TokenType.Whitespace
    );
    if (first && decoded(first).toLowerCase() === 'all') {
      const second = mediaTokens.find(
        (token) => token[2] > first[3] && token[0] !== TokenType.Whitespace
      );
      if (!legacy || second)
        normalized = normalized.slice(first[3] + 1).replace(/^\s+and\s+/i, '');
    }
  }
  rule.params = sortAndDedupe(splitTopLevel(normalized).map(split));

  if (!rule.params.length) {
    rule.raws.afterName = '';
  }
}

const allBugBrowers = new Set(['ie 10', 'ie 11']);

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-minify-params',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(options, stats, from, file, env);

      const hasAllBug = !new Set(browsers).isDisjointFrom(allBugBrowers);

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkAtRules((rule) => transform(hasAllBug, rule));
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
