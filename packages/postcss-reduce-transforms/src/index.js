import cssnanoUtils from 'cssnano-utils';

const {
  TokenType,
  asciiLowerCase,
  balancedTokens,
  decoded,
  numeric,
  tokenEnd,
  tokenStart,
} = cssnanoUtils;

const transformPropertyRegex = /[tT][rR][aA][nN][sS][fF][oO][rR][mM]$/v;

/** @typedef {{open: number, close: number, name: string, args: {significant: number[]}[]}} FunctionFrame */
/** @typedef {{number: number, unit: string} | string | undefined} ParsedArgument */

/** @param {number[]} significant @param {string} value @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens @param {NonNullable<ReturnType<typeof balancedTokens>>} structure @return {string} */
function argumentSource(significant, value, tokens, structure) {
  if (significant.length === 0) return '';
  const first = significant[0];
  const last = significant[significant.length - 1];
  const end = structure.endForOpening(first);
  return value.slice(
    tokenStart(tokens[first]),
    end !== undefined ? tokenEnd(tokens[end]) : tokenEnd(tokens[last])
  );
}

/**
 * @param {ParsedArgument} value
 * @returns {value is {number: number, unit: string}}
 */
function isNumericArgument(value) {
  return typeof value === 'object';
}

/**
 * @param {ParsedArgument} value
 * @returns {value is {number: number, unit: string}}
 */
function isUnitlessNumber(value) {
  return isNumericArgument(value) && value.unit === '';
}

/** @param {ParsedArgument} value @return {boolean} */
function isOne(value) {
  return isUnitlessNumber(value) && value.number === 1;
}

/**
 * Length units from CSS Values. A zero is a zero `<length-percentage>` only
 * when its unit is empty, `%`, or one of these; `0deg` or an unknown unit
 * makes the declaration invalid.
 */

const lengthUnits = new Set([
  'em',
  'ex',
  'cap',
  'ch',
  'ic',
  'rem',
  'lh',
  'rlh',
  'vw',
  'svw',
  'lvw',
  'dvw',
  'vh',
  'svh',
  'lvh',
  'dvh',
  'vi',
  'svi',
  'lvi',
  'dvi',
  'vb',
  'svb',
  'lvb',
  'dvb',
  'vmin',
  'svmin',
  'lvmin',
  'dvmin',
  'vmax',
  'svmax',
  'lvmax',
  'dvmax',
  'cm',
  'mm',
  'q',
  'in',
  'pt',
  'pc',
  'px',
]);

/**
 * @param {ParsedArgument} value
 * @return {boolean}
 */
function isZeroLengthPercentage(value) {
  if (!isNumericArgument(value) || value.number !== 0) return false;
  const unit = asciiLowerCase(value.unit);
  return unit === '' || unit === '%' || lengthUnits.has(unit);
}

/**
 * Reductions keyed by lower-cased function name. Each entry receives the
 * parsed arguments — `{number, unit}` for a numeric token, the source text of
 * a single-argument `var()`/`env()`, or `undefined` for anything else — and
 * returns the equivalent single-axis function with the argument index whose
 * source it keeps, or `undefined` when the value must stay as written.
 *
 * Where a component must be a `<number>` or `<length-percentage>`, a
 * dimension, percentage, or other unit makes the declaration invalid and the
 * reduction does not apply.
 *
 * @type {Map<string, (args: ParsedArgument[]) => [string, number] | undefined>}
 */
const reductions = new Map([
  [
    'rotate3d',
    (args) => {
      if (args.length !== 4) return undefined;
      const [x, y, z] = args;
      if (!isUnitlessNumber(x) || !isUnitlessNumber(y) || !isUnitlessNumber(z))
        return undefined;
      if (x.number === 1 && y.number === 0 && z.number === 0)
        return ['rotateX', 3];
      if (x.number === 0 && y.number === 1 && z.number === 0)
        return ['rotateY', 3];
      return undefined;
    },
  ],
  [
    'scale',
    (args) => {
      if (args.length !== 2) return undefined;
      const [sx, sy] = args;
      if (isUnitlessNumber(sy)) {
        if (isUnitlessNumber(sx) && sx.number === sy.number)
          return ['scale', 0];
        // scale(anything, 1) is scaleX(anything) for any valid first factor.
        if (sy.number === 1) return ['scaleX', 0];
      }
      if (isUnitlessNumber(sx) && sx.number === 1) return ['scaleY', 1];
      // Identical var()/env() references compute to the same value.
      if (typeof sx === 'string' && sx === sy) return ['scale', 0];
      return undefined;
    },
  ],
  [
    'scale3d',
    (args) =>
      args.length === 3 && isOne(args[0]) && isOne(args[1])
        ? ['scaleZ', 2]
        : undefined,
  ],
  [
    'translate',
    (args) => {
      if (args.length !== 2) return undefined;
      if (isZeroLengthPercentage(args[1])) return ['translate', 0];
      if (isZeroLengthPercentage(args[0])) return ['translateY', 1];
      return undefined;
    },
  ],
  [
    'translate3d',
    (args) => {
      if (args.length !== 3) return undefined;
      if (isZeroLengthPercentage(args[0]) && isZeroLengthPercentage(args[1]))
        return ['translateZ', 2];
      return undefined;
    },
  ],
]);

/** @param {string} value @return {string} */
function transform(value) {
  const structure = balancedTokens(value);
  if (!structure) return value;
  const { tokens } = structure;
  /** @type {FunctionFrame[]} */
  const functions = [];
  /** @type {Map<number, FunctionFrame>} */
  const functionsByOpen = new Map();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token[0] === TokenType.Function) {
      const close = structure.endForOpening(i);
      if (close === undefined) continue;
      const frame = {
        open: i,
        close,
        name: decoded(token),
        args: [],
      };
      functions.push(frame);
      functionsByOpen.set(i, frame);
    }
  }

  /** @type {[number, number, string][]} */
  const replacements = [];
  for (const frame of functions.toReversed()) {
    frame.args = structure
      .topLevelSegments(frame.open + 1, frame.close)
      .map(({ startIndex, endIndex }) => {
        /** @type {number[]} */
        const significant = [];
        for (let i = startIndex; i < endIndex; i++) {
          const token = tokens[i];
          // A nested block is one significant token: its interior is not an
          // argument boundary and is not numeric.
          const end = structure.endForOpening(i);
          if (end !== undefined) {
            significant.push(i);
            i = end;
            continue;
          }
          if (token[0] !== TokenType.Whitespace) significant.push(i);
        }
        return {
          significant,
        };
      });
    /** @type {(argument: {significant: number[]}) => ParsedArgument} */
    const parseArgument = (argument) => {
      if (argument.significant.length !== 1) return undefined;
      const index = argument.significant[0];
      const child = functionsByOpen.get(index);
      if (
        child &&
        (child.name === 'var' || child.name === 'env') &&
        child.args.length === 1 &&
        child.args[0].significant.length === 1
      ) {
        // Custom-property and environment variables are distinct namespaces,
        // so the resolving function is part of a reference's identity; names
        // themselves are case-sensitive.
        return `${child.name}(${argumentSource(
          child.args[0].significant,
          value,
          tokens,
          structure
        )})`;
      }
      const token = tokens[index];
      if (
        token[0] === TokenType.Function ||
        structure.endForOpening(index) !== undefined
      )
        return undefined;
      return numeric(token) || undefined;
    };
    const reduction = reductions.get(asciiLowerCase(frame.name))?.(
      frame.args.map(parseArgument)
    );
    if (!reduction) continue;
    const [targetFunction, index] = reduction;
    replacements.push([
      tokenStart(tokens[frame.open]),
      tokenEnd(tokens[frame.close]),
      `${targetFunction}(${argumentSource(
        frame.args[index].significant,
        value,
        tokens,
        structure
      )})`,
    ]);
  }

  // An outer reduction may span an already rewritten inner function; the
  // outermost edit applied last wins.
  let result = value;
  for (const [start, end, text] of replacements.toSorted((a, b) => b[0] - a[0]))
    result = result.slice(0, start) + text + result.slice(end);
  return result;
}

/** @return {import('postcss').Plugin} */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-reduce-transforms',
    prepare() {
      const cache = new Map();
      return {
        OnceExit(css) {
          css.walkDecls(transformPropertyRegex, (decl) => {
            const value =
              decl.raws.value?.value === decl.value
                ? (decl.raws.value.raw ?? decl.value)
                : decl.value;
            if (!value) return;
            if (!value.includes('(')) {
              assignValue(decl, value);
              cache.set(value, value);
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
