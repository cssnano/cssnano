import cssnanoUtils from 'cssnano-utils';

const {
  TokenType,
  asciiLowerCase,
  decoded,
  mathFunctions,
  tokenEnd,
  tokenStart,
} = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {{tokens: readonly CSSToken[], endForOpening(index: number): number | undefined}} BalancedIndex */
/** @type {(source: string) => BalancedIndex | undefined} */
const balancedTokens = cssnanoUtils.balancedTokens;

/**
 * The axis a side keyword names and its offset as a percentage of that axis.
 * @typedef {{axis: 'x' | 'y' | 'center', offset: string}} Side
 */
/** @type {Map<string, Side>} */
const sides = new Map([
  ['left', { axis: 'x', offset: '0' }],
  ['right', { axis: 'x', offset: '100%' }],
  ['top', { axis: 'y', offset: '0' }],
  ['bottom', { axis: 'y', offset: '100%' }],
  ['center', { axis: 'center', offset: '50%' }],
]);
/* Arbitrary substitution functions (CSS Values 5) may supply any number of
 * position terms, so the layer around them has no known shape. Dashed
 * function names are custom functions, which substitute the same way. */
const substitutionFunctions = new Set([
  'var',
  'env',
  'constant',
  'attr',
  'if',
  'inherit',
]);
/* Every value that can change contains a side keyword, possibly escaped. This
 * is a conservative shortcut before tokenizing, not a parse. */
const mayContainSide = /left|right|top|bottom|center|\\/iv;
const leadingWhitespace = /[ \t\n\r\f]*/vy;
const propFilterRegex =
  /^(?:[bB][aA][cC][kK][gG][rR][oO][uU][nN][dD](?:-[pP][oO][sS][iI][tT][iI][oO][nN])?|(?:-[A-Za-z0-9_]+-)?[pP][eE][rR][sS][pP][eE][cC][tT][iI][vV][eE]-[oO][rR][iI][gG][iI][nN])$/v;

/**
 * One term of a `<position>`: the source span of a keyword, a number or a
 * whole math function. `side` is set only for a side keyword.
 * @typedef {{start: number, end: number, side: Side | undefined}} PositionTerm
 */

/** @param {CSSToken} token */ const lowerName = (token) =>
  asciiLowerCase(String(decoded(token)));

/** @param {CSSToken} token */ const isTrivia = (token) =>
  token[0] === TokenType.Whitespace || token[0] === TokenType.Comment;

/** @param {CSSToken} token */
function isSubstitution(token) {
  if (token[0] !== TokenType.Function) return false;
  const name = lowerName(token);
  return substitutionFunctions.has(name) || name.startsWith('--');
}

/**
 * Any math function counts as a term: one that cannot yield a length leaves
 * the layer invalid either way, and counting it keeps the term run whole.
 * @param {BalancedIndex} index
 * @param {number} position index of the token in `index.tokens`
 * @return {PositionTerm | undefined}
 */
function positionTerm(index, position) {
  const token = index.tokens[position];
  const start = tokenStart(token);
  switch (token[0]) {
    case TokenType.Ident: {
      const side = sides.get(lowerName(token));
      return side ? { start, end: tokenEnd(token), side } : undefined;
    }
    case TokenType.Number:
    case TokenType.Percentage:
    case TokenType.Dimension:
      return { start, end: tokenEnd(token), side: undefined };
    case TokenType.Function: {
      if (!mathFunctions.has(lowerName(token))) return undefined;
      /* Balanced input closes every function. */
      const close = /** @type {number} */ (index.endForOpening(position));
      return { start, end: tokenEnd(index.tokens[close]), side: undefined };
    }
    default:
      return undefined;
  }
}

/**
 * Splits a value into the position term runs of its comma-separated layers.
 * A layer is skipped when a substitution function makes its shape unknown,
 * or when its terms are split by another component, which makes it invalid.
 * @param {BalancedIndex} index
 * @return {PositionTerm[][]}
 */
function positionLayers(index) {
  /** @type {PositionTerm[][]} */ const layers = [];
  /** @type {PositionTerm[]} */ let terms = [];
  let stopped = false;
  let separated = false;
  for (let position = 0; position < index.tokens.length; position++) {
    const token = index.tokens[position];
    if (token[0] === TokenType.Comma) {
      if (!stopped && terms.length) layers.push(terms);
      terms = [];
      stopped = false;
      separated = false;
      continue;
    }
    const term = stopped ? undefined : positionTerm(index, position);
    /* The contents of a function or block never hold this layer's terms. */
    position = index.endForOpening(position) ?? position;
    if (stopped) continue;
    if (isSubstitution(token)) stopped = true;
    else if (token[0] === TokenType.Delim && token[1] === '/') {
      /* The position ends where the background size begins. */
      if (terms.length) layers.push(terms);
      stopped = true;
    } else if (term) {
      if (separated) stopped = true;
      else terms.push(term);
    } else if (terms.length && !isTrivia(token)) separated = true;
  }
  if (!stopped && terms.length) layers.push(terms);
  return layers;
}

/**
 * The shortest spelling of a term used as a one-value position. A lone
 * horizontal or center keyword becomes its offset; a vertical keyword stays,
 * because a lone offset is always horizontal.
 * @param {string} value @param {PositionTerm} term
 */
const oneValue = (value, term) =>
  term.side && term.side.axis !== 'y'
    ? term.side.offset
    : value.slice(term.start, term.end);

/** @param {string} value @param {PositionTerm} first @param {PositionTerm} second @return {[number, number, string] | undefined} */
function twoValueReplacement(value, first, second) {
  /* A one-value position implies center on the other axis, so `X center`
   * becomes `X`. A slash that follows keeps one separating space. */
  if (second.side?.axis === 'center') {
    leadingWhitespace.lastIndex = second.end;
    /* The pattern matches the empty string, so it never fails. */
    const [whitespace] = /** @type {RegExpExecArray} */ (
      leadingWhitespace.exec(value)
    );
    const slashFollows = value[second.end + whitespace.length] === '/';
    return slashFollows && whitespace
      ? [
          first.start,
          second.end + whitespace.length,
          oneValue(value, first) + whitespace[0],
        ]
      : [first.start, second.end, oneValue(value, first)];
  }
  /* `center` beside a side keyword is the same implied default: `center top`
   * becomes `top` and `center left` becomes `0`. */
  if (first.side?.axis === 'center' && second.side)
    return [first.start, second.end, oneValue(value, second)];
  /* Two side keywords on different axes become offsets in x-then-y order. */
  if (first.side && second.side && first.side.axis !== second.side.axis) {
    const [x, y] =
      first.side.axis === 'x'
        ? [first.side, second.side]
        : [second.side, first.side];
    return [
      first.start,
      second.end,
      x.offset + value.slice(first.end, second.start) + y.offset,
    ];
  }
  return undefined;
}

/** @param {string} value @param {PositionTerm[]} terms @return {[number, number, string] | undefined} */
function positionReplacement(value, terms) {
  if (terms.length === 1)
    return [terms[0].start, terms[0].end, oneValue(value, terms[0])];
  if (terms.length === 2) return twoValueReplacement(value, terms[0], terms[1]);
  /* Three- and four-value positions have no shorter equivalent here. */
  return undefined;
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  if (!mayContainSide.test(value)) return value;
  const index = balancedTokens(value);
  /* Unbalanced brackets leave the layer structure unknown; keep the source. */
  if (!index) return value;
  let result = '';
  let copied = 0;
  for (const terms of positionLayers(index)) {
    const replacement = positionReplacement(value, terms);
    if (!replacement) continue;
    const [start, end, text] = replacement;
    result += value.slice(copied, start) + text;
    copied = end;
  }
  return copied ? result + value.slice(copied) : value;
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
