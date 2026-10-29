import cssnanoUtils from '#utils';
import { func } from '../../values/tokenConstructors.js';
import { closeParen } from '../../values/punctuationTokens.js';

const { TokenType, asciiLowerCase, decoded, numeric } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer} from '../../pipeline/host.js' */
/** @import {ValueBuffer} from '../../values/valueBuffer.js' */
/** @typedef {NonNullable<ReturnType<ValueBuffer['structure']>>} BalancedTokens */

/** The transform property and its vendor-prefixed forms, lower-cased. */
const transformProperties = new Set([
  'transform',
  '-webkit-transform',
  '-moz-transform',
  '-ms-transform',
  '-o-transform',
]);

/**
 * @typedef {{open: number, close: number, name: string, args: {significant: number[]}[], reduction?: [string, number]}} FunctionFrame
 */
/** @typedef {{number: number, unit: string} | string | undefined} ParsedArgument */

/**
 * The first and last token an argument keeps: its first significant token,
 * through the end of that token's block when it opens one.
 *
 * @param {number[]} significant
 * @param {BalancedTokens} structure
 * @return {[number, number] | undefined} undefined for an empty argument
 */
function argumentSpan(significant, structure) {
  if (significant.length === 0) return undefined;
  const first = significant[0];
  const last = significant[significant.length - 1];
  return [first, structure.endForOpening(first) ?? last];
}

/**
 * The tokens an argument keeps, as they are in the source.
 *
 * @param {number[]} significant
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokens} structure
 * @return {CSSToken[]}
 */
function argumentTokens(significant, tokens, structure) {
  const span = argumentSpan(significant, structure);
  return span ? tokens.slice(span[0], span[1] + 1) : [];
}

/**
 * The source text of the tokens from `first` through `last`. Each token's text
 * is its source, so the join is the slice of the source.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} first
 * @param {number} last
 * @return {string}
 */
function tokenSource(tokens, first, last) {
  let text = '';
  for (let index = first; index <= last; index++) {
    text += tokens[index][1];
  }
  return text;
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

/**
 * The edits that reduce the functions of a value, as token ranges. Only the
 * outermost reduction applies: its argument is copied from the source, so it
 * replaces any reduction inside it.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokens} structure
 * @return {{start: number, end: number, tokens: CSSToken[]}[]}
 */
function transformEdits(tokens, structure) {
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
        // The argument has one significant token, so its span is never empty.
        const [first, last] = /** @type {[number, number]} */ (
          argumentSpan(child.args[0].significant, structure)
        );
        return `${child.name}(${tokenSource(tokens, first, last)})`;
      }
      const token = tokens[index];
      if (
        token[0] === TokenType.Function ||
        structure.endForOpening(index) !== undefined
      )
        return undefined;
      return numeric(token) || undefined;
    };
    frame.reduction = reductions.get(asciiLowerCase(frame.name))?.(
      frame.args.map(parseArgument)
    );
  }

  /** @type {{start: number, end: number, tokens: CSSToken[]}[]} */
  const edits = [];
  // Frames are in ascending order of their opening token, so an outer frame
  // comes before the frames it contains.
  let reducedUntil = 0;
  for (const frame of functions) {
    if (!frame.reduction || frame.open < reducedUntil) continue;
    const [targetFunction, index] = frame.reduction;
    edits.push({
      start: frame.open,
      end: frame.close + 1,
      tokens: [
        func(targetFunction),
        ...argumentTokens(frame.args[index].significant, tokens, structure),
        closeParen(),
      ],
    });
    reducedUntil = frame.close + 1;
  }
  return edits;
}

/** @type {Reducer} */
const reduceTransform = (buffer) => {
  const structure = buffer.structure();
  if (!structure) return;
  buffer.replaceRanges(transformEdits(buffer.tokens(), structure));
};

/**
 * The stage for one run. It reads `transform` and its vendor-prefixed forms.
 *
 * @return {import('../../pipeline/host.js').Stage}
 */
function transformsStage() {
  return {
    forProperty: (property) =>
      transformProperties.has(asciiLowerCase(property))
        ? reduceTransform
        : null,
  };
}

/** @satisfies {import('../../pipeline/host.js').StageEntry} */
const reduceTransforms = { create: () => transformsStage() };

export { reduceTransforms as default };
