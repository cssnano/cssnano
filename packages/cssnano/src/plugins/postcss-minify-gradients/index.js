/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {PositionValue, TokenEdit} from './lib/positions.js' */
/** @import {ValueBuffer} from '../../values/valueBuffer.js' */
import cssnanoUtils from '#utils';
import isKnownColor from './isKnownColor.js';
import {
  applyTokenEdits,
  isPositionZeroUnit,
  zeroPositionEdits,
} from './lib/positions.js';
import { parsedValueTokens } from '../../utils/parsedValueText.js';
import { balancedStructure } from '../../utils/value.js';
import { numeric as numericToken } from '../../values/tokenConstructors.js';

const { TokenType, asciiLowerCase, decoded, numeric } = cssnanoUtils;

/**
 * The bracket structure of a value's tokens, as ValueBuffer gives it.
 * @typedef {NonNullable<ReturnType<ValueBuffer['structure']>>} Structure
 */

const directions = new Map([
  ['top', '0'],
  ['right', '90'],
  ['bottom', '180'],
  ['left', '270'],
]);
const gradientNames = new Set([
  'linear-gradient',
  'repeating-linear-gradient',
  '-webkit-linear-gradient',
  '-webkit-repeating-linear-gradient',
  'radial-gradient',
  'repeating-radial-gradient',
  'conic-gradient',
  'repeating-conic-gradient',
  '-webkit-radial-gradient',
  '-webkit-repeating-radial-gradient',
]);
const variableFunctions = new Set(['var', 'env']);
// Only these functions can compute a position, so any other leading function
// such as `rgb()` or `var()` cannot be one.
const positionFunctions = new Set(['calc', 'clamp', 'max', 'min']);
const gradientSourceRegex = /[gG][rR][aA][dD][iI][eE][nN][tT]/v;
// Identifiers that may start a gradient line, shape or size specification, so
// the argument carrying one is never a colour stop slot.
const lineKeywords = new Set([
  'at',
  'bottom',
  'center',
  'circle',
  'closest-corner',
  'closest-side',
  'ellipse',
  'farthest-corner',
  'farthest-side',
  'from',
  'in',
  'left',
  'right',
  'to',
  'top',
]);

/**
 * A gradient stop before fixup: the argument it came from, the extent of its
 * colour, and the position tokens following that colour.
 *
 * @typedef {object} ColorStop
 * @property {number} argIndex Comma-separated argument the stop came from.
 * @property {number} colorEnd Index of the colour's last token.
 * @property {readonly number[]} position Indexes of the positions following the colour.
 */

/**
 * Significant tokens of a range, skipping whitespace, comments and the contents
 * of any balanced frame the range opens.
 *
 * @param {readonly CSSToken[]} input
 * @param {Structure} structure
 * @param {{startIndex: number, endIndex: number}} range
 * @return {number[]} Indexes of the significant tokens in `input`.
 */
function significant(input, structure, range) {
  const result = [];
  for (let index = range.startIndex; index < range.endIndex; index++) {
    const token = input[index];
    if (token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comment) {
      result.push(index);
    }
    const frameEnd = structure.endForOpening(index);
    if (frameEnd !== undefined) index = frameEnd;
  }
  return result;
}

/**
 * Whether an argument starts a line, shape or size specification instead of a
 * colour. Numbers cannot start a colour, and every other token here has to be
 * an identifier the gradient grammar reserves for its first argument.
 *
 * @param {readonly CSSToken[]} input
 * @param {readonly number[]} parts Offsets of an argument's significant tokens.
 * @return {boolean}
 */
function startsLineSpecification(input, parts) {
  const token = input[parts[0]];
  if (!token) return false;
  if (
    token[0] === TokenType.Dimension ||
    token[0] === TokenType.Number ||
    token[0] === TokenType.Percentage
  ) {
    return true;
  }
  return (
    token[0] === TokenType.Ident &&
    lineKeywords.has(asciiLowerCase(decoded(token)))
  );
}

/**
 * Index of the last token of the leading colour of an argument, so a
 * functional colour such as `rgb(0 0 0 / 50%)` ends at its closing parenthesis.
 *
 * @param {readonly CSSToken[]} input
 * @param {Structure} structure
 * @param {readonly number[]} parts Indexes of an argument's significant tokens.
 * @return {number}
 */
function colorEnd(input, structure, parts) {
  const leading = parts[0];
  if (input[leading][0] !== TokenType.Function) return leading;
  return structure.endForOpening(leading) ?? leading;
}

/**
 * A `to <side>` line specification is an angle in fewer bytes.
 *
 * @param {readonly CSSToken[]} input
 * @param {readonly number[]} parts Significant tokens of the first argument.
 * @return {TokenEdit | undefined}
 */
function lineDirectionEdit(input, parts) {
  if (parts.length !== 2) return undefined;
  const from = input[parts[0]];
  const side = input[parts[1]];
  if (
    from[0] !== TokenType.Ident ||
    side[0] !== TokenType.Ident ||
    asciiLowerCase(decoded(from)) !== 'to'
  )
    return undefined;
  const degrees = directions.get(asciiLowerCase(decoded(side)));
  if (degrees === undefined) return undefined;
  return {
    start: parts[0],
    end: parts[1] + 1,
    tokens: [numericToken(degrees, 'deg')],
  };
}

/**
 * Collect the colour stops of one gradient argument list, the count of leading
 * arguments naming the line or shape instead of a stop, and the positions that
 * colour stop fixup clamps to a zero.
 *
 * @param {readonly CSSToken[]} input
 * @param {Structure} structure
 * @param {{startIndex: number, endIndex: number}[]} args
 * @param {boolean} linear Whether the line specification may hold an angle.
 * @param {boolean} conic Whether the stop positions are angles.
 * @return {{stops: ColorStop[], lineSpecifications: number, zeroEdits: Map<number, TokenEdit>, directionEdit: TokenEdit | undefined}}
 */
function collectColorStops(input, structure, args, linear, conic) {
  /** @type {ColorStop[]} */
  const stops = [];
  /** @type {Map<number, TokenEdit>} */
  const zeroEdits = new Map();
  /** @type {TokenEdit | undefined} */
  let directionEdit;
  // A stop may only drop its start position when nothing but these arguments
  // precede it.
  let lineSpecifications = 0;
  /** @type {PositionValue | undefined} */
  let largest;
  for (const [argIndex, range] of args.entries()) {
    const parts = significant(input, structure, range);
    if (!parts.length) continue;
    if (linear && argIndex === 0)
      directionEdit = lineDirectionEdit(input, parts);
    const end = colorEnd(input, structure, parts);
    const leading = input[parts[0]];
    const color = asciiLowerCase(
      input
        .slice(parts[0], end + 1)
        .map((token) => token[1])
        .join('')
    );
    const isColor =
      isKnownColor(color) ||
      (leading[0] === TokenType.Function &&
        !positionFunctions.has(asciiLowerCase(decoded(leading))));
    const position = isColor ? parts.slice(1) : parts;
    if (
      !isColor &&
      argIndex === lineSpecifications &&
      startsLineSpecification(input, parts)
    )
      lineSpecifications = argIndex + 1;
    if (isColor) {
      // A stop without a position sits at the running maximum, which starts at zero.
      if (!position.length && !largest) largest = { number: 0, unit: '%' };
      stops.push({ argIndex, colorEnd: end, position });
    }
    // Positions before the first stop belong to the line specification.
    if (!stops.length) continue;
    largest = zeroPositionEdits(input, position, largest, zeroEdits, conic);
  }
  return { stops, lineSpecifications, zeroEdits, directionEdit };
}

/**
 * The first colour stop defaults to the zero position and the last one to 100%,
 * so either can drop a position already spelling its default. A single-stop
 * gradient holds one stop in both slots, hence the slots by index and the
 * zero edit dropped in favour of the wider removal.
 *
 * @param {readonly CSSToken[]} input
 * @param {readonly ColorStop[]} stops
 * @param {number} lineSpecifications
 * @param {number} args
 * @param {Map<number, TokenEdit>} zeroEdits
 * @param {boolean} conic
 * @return {TokenEdit[]}
 */
function boundaryStopEdits(
  input,
  stops,
  lineSpecifications,
  args,
  zeroEdits,
  conic
) {
  /** @type {TokenEdit[]} */
  const edits = [];
  for (const slot of new Set([0, stops.length - 1])) {
    const stop = stops[slot];
    if (!stop || stop.position.length !== 1) continue;
    const [index] = stop.position;
    const position = input[index];
    const value = numeric(position);
    if (!value) continue;
    let removable = false;
    if (slot === 0 && stop.argIndex === lineSpecifications) {
      removable = value.number === 0 && isPositionZeroUnit(value.unit, conic);
    }
    if (
      slot === stops.length - 1 &&
      stop.argIndex === args - 1 &&
      value.number === 100 &&
      asciiLowerCase(value.unit) === '%'
    ) {
      removable = true;
    }
    if (!removable) continue;
    // Removing the position from the colour onwards also covers a zero edit
    // emitted for the same token.
    zeroEdits.delete(index);
    edits.push({ start: stop.colorEnd + 1, end: index + 1, tokens: [] });
  }
  return edits;
}

/**
 * Shortens the gradients of one value. Comments that PostCSS's parse drops
 * are dropped with the edits, so a rewritten value matches the parsed text.
 *
 * @param {ValueBuffer} buffer
 */
function reduce(buffer) {
  // The text precheck reads only a source value, as reading an edited one
  // would serialize its tokens.
  if (!buffer.isEdited() && !gradientSourceRegex.test(buffer.text())) return;
  const own = buffer.tokens();
  const input = own.some((token) => token[0] === TokenType.Comment)
    ? parsedValueTokens(own)
    : own;
  const structure =
    input === own ? buffer.structure() : balancedStructure(input);
  if (!structure) return;
  if (
    input.some(
      (token) =>
        token[0] === TokenType.Function &&
        variableFunctions.has(asciiLowerCase(decoded(token)))
    )
  )
    return;
  /** @type {TokenEdit[]} */
  const replacements = [];
  // Nested gradients are visited in token order; their argument ranges come
  // from the shared delimiter map.
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (token[0] !== TokenType.Function) continue;
    const name = asciiLowerCase(decoded(token));
    if (!gradientNames.has(name)) continue;
    const end = structure.endForOpening(index);
    if (end === undefined) continue;
    const args = structure.topLevelSegments(index + 1, end);
    // The legacy prefixed syntax has no `to <side>` form, where an angle
    // would also point in the opposite sense.
    const linear = name.includes('linear') && !name.startsWith('-webkit-');
    const conic = name.includes('conic');
    const { stops, lineSpecifications, zeroEdits, directionEdit } =
      collectColorStops(input, structure, args, linear, conic);
    if (directionEdit) replacements.push(directionEdit);
    replacements.push(
      ...boundaryStopEdits(
        input,
        stops,
        lineSpecifications,
        args.length,
        zeroEdits,
        conic
      ),
      ...zeroEdits.values()
    );
  }
  // With nothing to rewrite, the buffer keeps its source value.
  if (replacements.length) {
    buffer.replace(0, own.length, applyTokenEdits(input, replacements));
  }
}

/**
 * The stage keeps no state between values. It reads every property, as
 * gradients can appear in any of them.
 *
 * @satisfies {import('../../pipeline/host.js').StageEntry}
 */
const minifyGradients = {
  create: () => ({ forProperty: () => reduce }),
};

export { minifyGradients as default };
