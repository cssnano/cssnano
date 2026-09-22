import cssnanoUtils from 'cssnano-utils';
import mappings from './lib/map.js';

const { TokenType, asciiLowerCase, decoded, tokens } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const repeatPropertyRegex =
  /^(?:[bB][aA][cC][kK][gG][rR][oO][uU][nN][dD](?:-[rR][eE][pP][eE][aA][tT])?|(?:-[A-Za-z0-9_]+-)?[mM][aA][sS][kK]-[rR][eE][pP][eE][aA][tT])$/v;
const repeatKeywords = new Set(mappings.values());

const variableFunctions = new Set(['var', 'env', 'constant']);

/** @param {import('@csstools/css-tokenizer').TokenType} type */
function changesDepth(type) {
  if (
    type === TokenType.Function ||
    type === TokenType.OpenParen ||
    type === TokenType.OpenSquare ||
    type === TokenType.OpenCurly
  )
    return 1;
  if (
    type === TokenType.CloseParen ||
    type === TokenType.CloseSquare ||
    type === TokenType.CloseCurly
  )
    return -1;
  return 0;
}

/**
 * Splits the token stream into comma-separated layers at the top nesting depth.
 * Each layer is reported as its starting token index so gap checks can scan
 * only that layer instead of re-reading the whole declaration.
 * @param {CSSToken[]} input @return {[number, CSSToken[], boolean][]}
 */
function repeatLayers(input) {
  let depth = 0;
  let layerTokenStart = 0;
  let stopped = false;
  /** @type {CSSToken[]} */ let candidates = [];
  /** @type {[number, CSSToken[], boolean][]} */ const layers = [];
  let tokenIndex = 0;
  for (const token of input) {
    const type = token[0];
    if (type === TokenType.EOF) break;
    if (
      depth === 0 &&
      type === TokenType.Function &&
      variableFunctions.has(asciiLowerCase(decoded(token)))
    ) {
      stopped = true;
      candidates = [];
    }
    depth += changesDepth(type);
    if (depth === 0 && type === TokenType.Comma) {
      layers.push([layerTokenStart, candidates, stopped]);
      layerTokenStart = tokenIndex + 1;
      candidates = [];
      stopped = false;
    } else if (depth === 0 && type === TokenType.Delim && token[1] === '/')
      stopped = true;
    else if (
      !stopped &&
      depth === 0 &&
      type === TokenType.Ident &&
      repeatKeywords.has(asciiLowerCase(decoded(token)))
    )
      candidates.push(token);
    tokenIndex++;
  }
  layers.push([layerTokenStart, candidates, stopped]);
  return layers;
}

/**
 * Whether nothing significant stands between the two keywords: only whitespace
 * and comments, which the CSS syntax permits between component values. Any
 * other token there is a component value that must survive the rewrite.
 * @param {CSSToken[]} input
 * @param {number} layerTokenStart
 * @param {CSSToken} first
 * @param {CSSToken} second
 * @return {boolean}
 */
function isInsignificantGap(input, layerTokenStart, first, second) {
  // Both keywords live in the same layer, so no token before the layer can
  // fall between them; scanning from the layer start keeps the total work
  // linear in the declaration length across all layers.
  for (let index = layerTokenStart; index < input.length; index++) {
    const token = input[index];
    if (token[3] <= first[3]) continue;
    if (token[2] >= second[2]) return true;
    const type = token[0];
    if (type !== TokenType.Whitespace && type !== TokenType.Comment)
      return false;
  }
  return true;
}

/** @param {CSSToken[]} input @param {number} layerTokenStart @param {CSSToken[]} terms @return {[number, number, string] | undefined} */
function repeatReplacement(input, layerTokenStart, terms) {
  if (terms.length !== 2) return undefined;
  const [first, second] = terms;
  if (!isInsignificantGap(input, layerTokenStart, first, second))
    return undefined;
  const match = mappings.get(
    [decoded(first), decoded(second)].map(asciiLowerCase).toString()
  );
  return match ? [first[2], second[3] + 1, match] : undefined;
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  /** @type {CSSToken[]} */ const input = tokens(value);
  if (input.length === 2) {
    return value;
  }
  /** @type {[number, number, string][]} */
  const replacements = [];
  for (const [layerTokenStart, terms, skipped] of repeatLayers(input)) {
    const replacement = skipped
      ? undefined
      : repeatReplacement(input, layerTokenStart, terms);
    if (replacement) replacements.push(replacement);
  }
  // Replacements are ascending and non-overlapping, so one forward pass joins
  // each untouched span exactly once instead of re-slicing the whole value.
  let result = '';
  let cursor = 0;
  for (const [start, end, text] of replacements) {
    result += value.slice(cursor, start) + text;
    cursor = end;
  }
  return result + value.slice(cursor);
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-repeat-style',
    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(repeatPropertyRegex, (decl) => {
            const value =
              decl.raws.value?.value === decl.value
                ? (decl.raws.value.raw ?? decl.value)
                : decl.value;

            if (!value) {
              return;
            }

            if (cache.has(value)) {
              assignValue(decl, cache.get(value));

              return;
            }

            const result = transform(value);

            assignValue(decl, result);
            cache.set(value, result);
          });
        },
      };
    },
  };
}

/** @param {import('postcss').Declaration} decl @param {string} value */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) decl.raws.value = { raw: value, value };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
