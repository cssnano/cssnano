import cssnanoUtils from 'cssnano-utils';
import mappings from './lib/map.js';

const { TokenType, decoded, tokens } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const repeatPropertyRegex =
  /^(?:background(?:-repeat)?|(?:-\w+-)?mask-repeat)$/i;
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

/** @param {CSSToken[]} input @param {string} value @return {[number, number, CSSToken[], boolean][]} */
function repeatLayers(input, value) {
  let depth = 0;
  let layerStart = 0;
  let stopped = false;
  /** @type {CSSToken[]} */ let candidates = [];
  /** @type {[number, number, CSSToken[], boolean][]} */ const layers = [];
  for (const token of input) {
    const type = token[0];
    if (type === TokenType.EOF) break;
    if (
      depth === 0 &&
      type === TokenType.Function &&
      variableFunctions.has(decoded(token).toLowerCase())
    ) {
      stopped = true;
      candidates = [];
    }
    depth += changesDepth(type);
    if (depth === 0 && type === TokenType.Comma) {
      layers.push([layerStart, token[2] - 1, candidates, stopped]);
      layerStart = token[3] + 1;
      candidates = [];
      stopped = false;
    } else if (depth === 0 && type === TokenType.Delim && token[1] === '/')
      stopped = true;
    else if (
      !stopped &&
      depth === 0 &&
      type === TokenType.Ident &&
      repeatKeywords.has(decoded(token).toLowerCase())
    )
      candidates.push(token);
  }
  layers.push([layerStart, value.length - 1, candidates, stopped]);
  return layers;
}

/** @param {string} value @param {CSSToken[]} terms @return {[number, number, string] | undefined} */
function repeatReplacement(value, terms) {
  if (terms.length !== 2) return undefined;
  const [first, second] = terms;
  if (!/^(?:\s|\/\*[\s\S]*?\*\/)+$/u.test(value.slice(first[3] + 1, second[2])))
    return undefined;
  const match = mappings.get(
    [decoded(first), decoded(second)].map((x) => x.toLowerCase()).toString()
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
  for (const [, , terms, skipped] of repeatLayers(input, value)) {
    const replacement = skipped ? undefined : repeatReplacement(value, terms);
    if (replacement) replacements.push(replacement);
  }
  let result = value;
  for (const [start, end, text] of replacements.toReversed())
    result = result.slice(0, start) + text + result.slice(end);
  return result;
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
