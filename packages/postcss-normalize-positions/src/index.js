import cssnanoUtils from 'cssnano-utils';

const { TokenType, asciiLowerCase, decoded, tokenEnd, tokenStart, tokens } =
  cssnanoUtils;

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
/* Only the length-producing math functions a position slot accepts; a
 * number-returning one such as sin() makes the declaration invalid. See
 * cssnano-utils' mathFunctions for the full Values 4 table. */
const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);
const variableFunctions = new Set(['var', 'env', 'constant']);
const leadingWhitespace = /[ \t\n\r\f]*/vy;
const propFilterRegex =
  /^(?:[bB][aA][cC][kK][gG][rR][oO][uU][nN][dD](?:-[pP][oO][sS][iI][tT][iI][oO][nN])?|(?:-[A-Za-z0-9_]+-)?[pP][eE][rR][sS][pP][eE][cC][tT][iI][vV][eE]-[oO][rR][iI][gG][iI][nN])$/v;

/** @param {CSSToken} token */ const isMathFunction = (token) =>
  token[0] === TokenType.Function &&
  mathFunctions.has(asciiLowerCase(String(decoded(token))));
/** @param {CSSToken} token */ const isVariableFunction = (token) =>
  token[0] === TokenType.Function &&
  variableFunctions.has(asciiLowerCase(String(decoded(token))));
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
      directionKeywords.has(asciiLowerCase(String(decoded(token))))) ||
    isNumber(token) ||
    isMathFunction(token)
  );
}

/** @param {CSSToken} token */ const isTrivia = (token) =>
  token[0] === TokenType.Whitespace || token[0] === TokenType.Comment;

/** @param {CSSToken[]} input */
function positionLayers(input) {
  /** @type {CSSToken[][]} */ const layers = [];
  /** @type {CSSToken[]} */ let terms = [];
  let depth = 0;
  let stopped = false;
  let separated = false;
  const flush = () => {
    if (terms.length) layers.push(terms);
    terms = [];
    stopped = false;
    separated = false;
  };
  const abandon = () => {
    stopped = true;
    terms = [];
  };
  for (const token of input) {
    if (token[0] === TokenType.EOF) break;
    if (depth === 0 && token[0] === TokenType.Comma) {
      flush();
      continue;
    }
    if (depth === 0 && token[0] === TokenType.Delim && token[1] === '/')
      stopped = true;
    if (depth === 0 && isVariableFunction(token)) abandon();
    if (depth === 0 && !stopped) {
      /* A <position> is one contiguous run of terms; terms split by another
       * component make the layer invalid, so leave it for the browser to drop. */
      if (!isPositionTerm(token))
        separated ||= terms.length > 0 && !isTrivia(token);
      else if (separated) abandon();
      else terms.push(token);
    }
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
  const input = tokens(value);
  return applyPositionReplacements(value, positionLayers(input));
}

/** @param {string} keyword */ const horizontalOffset = (keyword) =>
  keyword === 'center' ? center : horizontal.get(keyword);

/** @param {CSSToken} token @return {[number, number, string] | undefined} */
function singlePositionReplacement(token) {
  const output = horizontalOffset(asciiLowerCase(String(decoded(token))));
  return output ? [tokenStart(token), tokenEnd(token), output] : undefined;
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
    tokenStart(firstToken),
    tokenEnd(secondToken),
    left + value.slice(firstToken[3] + 1, secondToken[2]) + right,
  ];
}

/** @param {string} value @param {CSSToken} firstToken @param {CSSToken} secondToken @return {[number, number, string] | undefined} */
function twoPositionReplacement(value, firstToken, secondToken) {
  const first = asciiLowerCase(String(decoded(firstToken)));
  const second = asciiLowerCase(String(decoded(secondToken)));
  const firstOutput = horizontal.get(first) || verticalValue.get(first);
  const secondOutput = horizontal.get(second) || verticalValue.get(second);
  if (second === 'center') {
    const afterSecond = secondToken[3] + 1;
    leadingWhitespace.lastIndex = afterSecond;
    const whitespace = leadingWhitespace.exec(value)?.[0] ?? '';
    const slashFollows =
      !directionKeywords.has(first) &&
      value[afterSecond + whitespace.length] === '/';
    /* A one-value position implies center on the other axis, so `X center`
     * becomes `X`; only left, right and center need converting. */
    const output =
      horizontalOffset(first) ??
      value.slice(tokenStart(firstToken), tokenStart(secondToken)).trimEnd();
    return [
      tokenStart(firstToken),
      afterSecond + (slashFollows ? whitespace.length : 0),
      output + (slashFollows ? whitespace[0] || '' : ''),
    ];
  }
  /* `center` beside a side keyword is the implied one-value default, so
   * `center top` becomes `top` and `center left` becomes `0`. */
  if (first === 'center' && secondOutput)
    return [
      tokenStart(firstToken),
      tokenEnd(secondToken),
      horizontal.get(second) ??
        value.slice(tokenStart(secondToken), tokenEnd(secondToken)),
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
