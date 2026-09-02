import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
const directionKeywords = new Set(['top', 'right', 'bottom', 'left', 'center']);

const center = '50%';
const horizontal = new Map([
  ['right', '100%'],
  ['left', '0'],
]);
const verticalValue = new Map([
  ['bottom', '100%'],
  ['top', '0'],
]);
const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);
const variableFunctions = new Set(['var', 'env', 'constant']);
const propFilterRegex =
  /^(?:background(?:-position)?|(?:-\w+-)?perspective-origin)$/i;

/** @param {CSSToken} token */ const isMathFunction = (token) =>
  token[0] === TokenType.Function &&
  mathFunctions.has(token[1].slice(0, -1).toLowerCase());
/** @param {CSSToken} token */ const isVariableFunction = (token) =>
  token[0] === TokenType.Function &&
  variableFunctions.has(token[1].slice(0, -1).toLowerCase());
/** @param {CSSToken} token */ const isNumber = (token) =>
  token[0] === TokenType.Number ||
  token[0] === TokenType.Percentage ||
  token[0] === TokenType.Dimension;

/** @param {import('@csstools/css-tokenizer').TokenType} type */
function depthChange(type) {
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

/** @param {CSSToken} token */
function isPositionTerm(token) {
  return (
    (token[0] === TokenType.Ident &&
      directionKeywords.has(token[1].toLowerCase())) ||
    isNumber(token) ||
    isMathFunction(token)
  );
}

/** @param {CSSToken[]} tokens */
function positionLayers(tokens) {
  /** @type {CSSToken[][]} */ const layers = [];
  /** @type {CSSToken[]} */ let terms = [];
  let depth = 0;
  let stopped = false;
  const flush = () => {
    if (terms.length) layers.push(terms);
    terms = [];
    stopped = false;
  };
  for (const token of tokens) {
    if (token[0] === TokenType.EOF) break;
    if (depth === 0 && token[0] === TokenType.Comma) {
      flush();
      continue;
    }
    if (depth === 0 && token[0] === TokenType.Delim && token[1] === '/')
      stopped = true;
    if (depth === 0 && isVariableFunction(token)) {
      stopped = true;
      terms = [];
    }
    if (depth === 0 && !stopped && isPositionTerm(token)) terms.push(token);
    depth += depthChange(token[0]);
  }
  flush();
  return layers;
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  /** @type {CSSToken[]} */ const tokens = [...tokenize({ css: value })];
  return applyPositionReplacements(value, positionLayers(tokens));
}

/** @param {CSSToken} token @return {[number, number, string] | undefined} */
function singlePositionReplacement(token) {
  const keyword = token[1].toLowerCase();
  const output = keyword === 'center' ? center : horizontal.get(keyword);
  return output ? [token[2], token[3] + 1, output] : undefined;
}

/** @param {string} value @param {CSSToken} firstToken @param {CSSToken} secondToken @param {string} first @param {string} second @param {string | undefined} firstOutput @param {string | undefined} secondOutput @return {[number, number, string] | undefined} */
function axisSwapReplacement(
  value,
  firstToken,
  secondToken,
  first,
  second,
  firstOutput,
  secondOutput
) {
  const swapsAxes =
    (horizontal.has(first) && verticalValue.has(second)) ||
    (verticalValue.has(first) && horizontal.has(second));
  if (!swapsAxes) return undefined;
  const left = verticalValue.has(first) ? secondOutput : firstOutput;
  const right = verticalValue.has(first) ? firstOutput : secondOutput;
  return [
    firstToken[2],
    secondToken[3] + 1,
    left + value.slice(firstToken[3] + 1, secondToken[2]) + right,
  ];
}

/** @param {string} value @param {CSSToken} firstToken @param {CSSToken} secondToken @return {[number, number, string] | undefined} */
function twoPositionReplacement(value, firstToken, secondToken) {
  const first = firstToken[1].toLowerCase();
  const second = secondToken[1].toLowerCase();
  const firstOutput = horizontal.get(first) || verticalValue.get(first);
  const secondOutput = horizontal.get(second) || verticalValue.get(second);
  if (second === 'center') {
    const afterSecond = secondToken[3] + 1;
    const whitespace = value.slice(afterSecond).match(/^\s*/)?.[0] || '';
    const slashFollows =
      !firstOutput &&
      first !== 'center' &&
      value[afterSecond + whitespace.length] === '/';
    const output =
      firstOutput ||
      (first === 'center'
        ? center
        : value.slice(firstToken[2], secondToken[2]).trimEnd());
    return [
      firstToken[2],
      afterSecond + (slashFollows ? whitespace.length : 0),
      output + (slashFollows ? whitespace[0] || '' : ''),
    ];
  }
  if (first === 'center' && horizontal.has(second))
    return [
      firstToken[2],
      secondToken[3] + 1,
      /** @type {string} */ (secondOutput),
    ];
  return axisSwapReplacement(
    value,
    firstToken,
    secondToken,
    first,
    second,
    firstOutput,
    secondOutput
  );
}

/** @param {string} value @param {CSSToken[]} candidates @return {[number, number, string] | undefined} */
function positionReplacement(value, candidates) {
  if (candidates.length === 1) return singlePositionReplacement(candidates[0]);
  if (candidates.length === 2)
    return twoPositionReplacement(value, candidates[0], candidates[1]);
  return undefined;
}

/** @param {string} value @param {CSSToken[][]} layers @return {string} */
function applyPositionReplacements(value, layers) {
  /** @type {[number, number, string][]} */ const replacements = [];
  for (const candidates of layers) {
    const replacement = positionReplacement(value, candidates);
    if (replacement) replacements.push(replacement);
  }
  let result = value;
  for (const [a, b, text] of replacements.toReversed())
    result = result.slice(0, a) + text + result.slice(b);
  return result;
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-positions',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(propFilterRegex, (decl) => {
        const value = decl.value;

        if (!value) {
          return;
        }

        if (cache.has(value)) {
          decl.value = cache.get(value);

          return;
        }

        const result = transform(value);

        decl.value = result;
        cache.set(value, result);
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
