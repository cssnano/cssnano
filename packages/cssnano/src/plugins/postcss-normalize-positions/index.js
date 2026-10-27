import cssnanoUtils from '#utils';
import { integer, percentage } from '../../values/tokenConstructors.js';

const {
  TokenType,
  asciiLowerCase,
  decoded,
  isSubstitutionFunction,
  mathFunctions,
} = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */
/** @import {ValueBuffer} from '../../values/valueBuffer.js' */
/** @typedef {NonNullable<ReturnType<ValueBuffer['structure']>>} Structure */

/**
 * The axis a side keyword names and the offset it stands for, as a percentage
 * of that axis. Each edit builds its offset token afresh.
 * @typedef {{axis: 'x' | 'y' | 'center', offset: () => CSSToken}} Side
 */
/** @type {Map<string, Side>} */
const sides = new Map([
  ['left', { axis: 'x', offset: () => integer(0) }],
  ['right', { axis: 'x', offset: () => percentage(100) }],
  ['top', { axis: 'y', offset: () => integer(0) }],
  ['bottom', { axis: 'y', offset: () => percentage(100) }],
  ['center', { axis: 'center', offset: () => percentage(50) }],
]);
/* Before an edit, every value that can change contains a side keyword, possibly
 * escaped. This is a conservative shortcut on the source, not a parse. */
const mayContainSide = /left|right|top|bottom|center|\\/iv;
const propFilterRegex =
  /^(?:[bB][aA][cC][kK][gG][rR][oO][uU][nN][dD](?:-[pP][oO][sS][iI][tT][iI][oO][nN])?|(?:-[A-Za-z0-9_]+-)?[pP][eE][rR][sS][pP][eE][cC][tT][iI][vV][eE]-[oO][rR][iI][gG][iI][nN])$/v;

/**
 * One term of a `<position>`: the tokens of a keyword, a number or a whole math
 * function, as indexes into the token list with `end` exclusive. `side` is set
 * only for a side keyword.
 * @typedef {{start: number, end: number, side: Side | undefined}} PositionTerm
 */

/**
 * The tokens that replace the span from `start` up to `end`, exclusive.
 * @typedef {{start: number, end: number, replacement: CSSToken[]}} Edit
 */

/** @param {CSSToken} token */ const lowerName = (token) =>
  asciiLowerCase(String(decoded(token)));

/** @param {CSSToken} token */ const isTrivia = (token) =>
  token[0] === TokenType.Whitespace || token[0] === TokenType.Comment;

/** @param {CSSToken} token */
function isSubstitution(token) {
  if (token[0] !== TokenType.Function) return false;
  const name = lowerName(token);
  return isSubstitutionFunction(name);
}

/**
 * Any math function counts as a term: one that cannot yield a length leaves
 * the layer invalid either way, and counting it keeps the term run whole.
 * @param {Structure} structure
 * @param {number} position index of the token in `structure.tokens`
 * @return {PositionTerm | undefined}
 */
function positionTerm(structure, position) {
  const token = structure.tokens[position];
  switch (token[0]) {
    case TokenType.Ident: {
      const side = sides.get(lowerName(token));
      return side ? { start: position, end: position + 1, side } : undefined;
    }
    case TokenType.Number:
    case TokenType.Percentage:
    case TokenType.Dimension:
      return { start: position, end: position + 1, side: undefined };
    case TokenType.Function: {
      if (!mathFunctions.has(lowerName(token))) return undefined;
      /* Balanced input closes every function. */
      const close = /** @type {number} */ (structure.endForOpening(position));
      return { start: position, end: close + 1, side: undefined };
    }
    default:
      return undefined;
  }
}

/**
 * Splits a value into the position term runs of its comma-separated layers.
 * A layer is skipped when it contains a CSS function
 * or when its terms are split by another component.
 * @param {Structure} structure
 * @return {PositionTerm[][]}
 */
function positionLayers(structure) {
  const { tokens } = structure;
  /** @type {PositionTerm[][]} */ const layers = [];
  /** @type {PositionTerm[]} */ let terms = [];
  let stopped = false;
  let separated = false;
  for (let position = 0; position < tokens.length; position++) {
    const token = tokens[position];
    if (token[0] === TokenType.Comma) {
      if (!stopped && terms.length) layers.push(terms);
      terms = [];
      stopped = false;
      separated = false;
      continue;
    }
    const term = stopped ? undefined : positionTerm(structure, position);
    /* The contents of a function or block never hold this layer's terms. */
    position = structure.endForOpening(position) ?? position;
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
 * The tokens of a term written as a one-value position. A lone horizontal or
 * center keyword becomes its offset; a vertical keyword stays, because a lone
 * offset is always horizontal.
 * @param {readonly CSSToken[]} tokens @param {PositionTerm} term
 * @return {CSSToken[]}
 */
const oneValue = (tokens, term) =>
  term.side && term.side.axis !== 'y'
    ? [term.side.offset()]
    : tokens.slice(term.start, term.end);

/**
 * @param {readonly CSSToken[]} tokens
 * @param {PositionTerm} first
 * @param {PositionTerm} second
 * @return {Edit | undefined}
 */
function twoValueReplacement(tokens, first, second) {
  /* A one-value position implies center on the other axis, so `X center`
   * becomes `X`. The tokens after the second term, such as the space before a
   * `/`, stay as they are. */
  if (second.side?.axis === 'center')
    return {
      start: first.start,
      end: second.end,
      replacement: oneValue(tokens, first),
    };
  /* `center` beside a side keyword is the same implied default: `center top`
   * becomes `top` and `center left` becomes `0`. */
  if (first.side?.axis === 'center' && second.side)
    return {
      start: first.start,
      end: second.end,
      replacement: oneValue(tokens, second),
    };
  /* Two side keywords on different axes become offsets in x-then-y order. */
  if (first.side && second.side && first.side.axis !== second.side.axis) {
    const [x, y] =
      first.side.axis === 'x'
        ? [first.side, second.side]
        : [second.side, first.side];
    return {
      start: first.start,
      end: second.end,
      replacement: [
        x.offset(),
        ...tokens.slice(first.end, second.start),
        y.offset(),
      ],
    };
  }
  return undefined;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {PositionTerm[]} terms
 * @return {Edit | undefined}
 */
function positionReplacement(tokens, terms) {
  if (terms.length === 1) {
    const [term] = terms;
    if (!term.side || term.side.axis === 'y') return undefined;
    return {
      start: term.start,
      end: term.end,
      replacement: [term.side.offset()],
    };
  }
  if (terms.length === 2)
    return twoValueReplacement(tokens, terms[0], terms[1]);
  /* Three- and four-value positions have no shorter equivalent here. */
  return undefined;
}

/** @type {Reducer} */
const reduce = (buffer) => {
  if (!buffer.isEdited() && !mayContainSide.test(buffer.text())) return;
  // Unbalanced brackets leave the layer structure unknown; keep the source.
  const structure = buffer.structure();
  if (!structure) return;
  const { tokens } = structure;
  /** @type {CSSToken[]} */ const output = [];
  let copied = 0;
  let changed = false;
  for (const terms of positionLayers(structure)) {
    const edit = positionReplacement(tokens, terms);
    if (!edit) continue;
    for (; copied < edit.start; copied++) output.push(tokens[copied]);
    output.push(...edit.replacement);
    copied = edit.end;
    changed = true;
  }
  if (!changed) return;
  for (; copied < tokens.length; copied++) output.push(tokens[copied]);
  buffer.replace(0, tokens.length, output);
};

/**
 * The stage for one run. It reads the background and mask position properties.
 *
 * @return {Stage}
 */
function positionStage() {
  return {
    forProperty: (property) => (propFilterRegex.test(property) ? reduce : null),
  };
}

/** @satisfies {StageEntry} */
const normalizePositions = { create: () => positionStage() };

export { normalizePositions as default };
