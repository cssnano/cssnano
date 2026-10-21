/**
 * The keyword grammars of the pair families and the helpers that turn them
 * into setters. Each alphabet is closed: a token outside it is invalid.
 *
 * @import {Grammar, Setter} from "./pairFamilyOracle.js"
 */
/**
 * @param {string[]} keywords
 * @return {Grammar}
 */
function keywordsOf(keywords) {
  const accepted = new Set(keywords);
  return (token) => {
    const lower = token.toLowerCase();
    return accepted.has(lower) ? lower : undefined;
  };
}

/**
 * A setter whose one grammar gives every name it writes the same value.
 *
 * @param {string[]} names
 * @param {Grammar} grammar
 * @return {Setter}
 */
export function sameValue(names, grammar) {
  return {
    names,
    parse: (value) => {
      const written = grammar(value);
      return written === undefined ? undefined : names.map(() => written);
    },
  };
}

/**
 * A setter for a shorthand of two longhands. A lone value must be valid for
 * the first, and `omitted` gives the second's value from it, which must be
 * valid for the second too. A second value is parsed as the second longhand.
 *
 * @param {[string, string]} names
 * @param {[Grammar, Grammar]} grammars
 * @param {(first: string) => string} omitted
 * @return {Setter}
 */
export function twoValues(names, [parseFirst, parseSecond], omitted) {
  return {
    names,
    parse: (value) => {
      const tokens = value.split(/\s+/v);
      if (tokens.length === 1) {
        const first = parseFirst(tokens[0]);
        if (first === undefined) return undefined;
        const second = parseSecond(omitted(first));
        return second === undefined ? undefined : [first, second];
      }
      if (tokens.length !== 2) return undefined;
      const first = parseFirst(tokens[0]);
      const second = parseSecond(tokens[1]);
      return first === undefined || second === undefined
        ? undefined
        : [first, second];
    },
  };
}

/** @param {string} first */
export const copyFirst = (first) => first;

/**
 * An omitted second value copies the first, except that a baseline position
 * leaves `start`, which every justify grammar accepts.
 *
 * @param {string} first
 */
export const copyFirstUnlessBaseline = (first) =>
  first === 'baseline' ? 'start' : first;

export const gapValue = keywordsOf(['normal', '0', '1px', '2em', '10%']);

export const alignContent = keywordsOf([
  'normal',
  'baseline',
  'start',
  'center',
  'end',
  'stretch',
  'space-between',
  'space-around',
  'space-evenly',
]);
export const justifyContent = keywordsOf([
  'normal',
  'start',
  'center',
  'end',
  'left',
  'right',
  'stretch',
  'space-between',
  'space-around',
  'space-evenly',
]);

export const alignItems = keywordsOf([
  'normal',
  'stretch',
  'baseline',
  'start',
  'center',
  'end',
  'self-start',
  'self-end',
]);
export const justifyItems = keywordsOf([
  'normal',
  'stretch',
  'baseline',
  'start',
  'center',
  'end',
  'self-start',
  'self-end',
  'left',
  'right',
]);

export const alignSelf = keywordsOf([
  'auto',
  'normal',
  'stretch',
  'baseline',
  'start',
  'center',
  'end',
  'self-start',
  'self-end',
]);
export const justifySelf = keywordsOf([
  'auto',
  'normal',
  'stretch',
  'baseline',
  'start',
  'center',
  'end',
  'self-start',
  'self-end',
  'left',
  'right',
]);

export const overscroll = keywordsOf(['auto', 'contain', 'none']);
export const overflowAxis = keywordsOf([
  'visible',
  'hidden',
  'clip',
  'scroll',
  'auto',
]);
export const flexDirection = keywordsOf([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);
export const flexWrap = keywordsOf(['nowrap', 'wrap', 'wrap-reverse']);

export const lineWidth = keywordsOf([
  '0',
  '1px',
  '2px',
  'thin',
  'medium',
  'thick',
]);
export const lineStyle = keywordsOf([
  'none',
  'solid',
  'dashed',
  'dotted',
  'double',
]);
export const lineColor = keywordsOf(['red', 'blue', 'currentcolor']);

/**
 * A `||` group: its components in either order, each at most once. The
 * alphabets are disjoint, so each token belongs to one component. An omitted
 * component takes its initial value.
 *
 * @param {Grammar[]} grammars
 * @param {string[]} initials
 * @return {(value: string) => (string | undefined)[] | undefined}
 */
export function unordered(grammars, initials) {
  return (value) => {
    const tokens = value.split(/\s+/v);
    if (tokens.length > grammars.length) return undefined;
    /** @type {(string | undefined)[]} */
    const parts = grammars.map(() => undefined);
    for (const token of tokens) {
      const slot = grammars.findIndex(
        (grammar, index) =>
          parts[index] === undefined && grammar(token) !== undefined
      );
      if (slot === -1) return undefined;
      parts[slot] = grammars[slot](token);
    }
    return parts.map((part, index) => part ?? initials[index]);
  };
}
