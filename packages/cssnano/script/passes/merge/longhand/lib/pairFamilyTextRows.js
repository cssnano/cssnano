import { keywordsOf, sameValue } from './pairFamilyGrammar.js';

/** @import {PairRow, Setter} from './pairFamilyOracle.js' */

/**
 * Splits a shorthand value into its whitespace-separated tokens. The oracle's
 * alphabets are closed, so a token outside them makes the value invalid.
 *
 * @param {string} value
 * @return {string[]}
 */
function tokensOf(value) {
  return value.trim().split(/\s+/v);
}

const emphasisStyle = keywordsOf([
  'none',
  'filled',
  'open',
  'dot',
  'circle',
  'filled dot',
  'open circle',
  '"x"',
]);
const emphasisColor = keywordsOf(['red', 'blue', 'currentcolor']);

/**
 * `text-emphasis` takes a style, which may be two keywords, and a color, in
 * either order. The omitted style is `none` and the omitted color is
 * `currentcolor`.
 *
 * @param {string} value
 * @return {(string | undefined)[] | undefined}
 */
function parseEmphasis(value) {
  const tokens = tokensOf(value);
  const colors = tokens.filter((token) => emphasisColor(token) !== undefined);
  if (colors.length > 1) return undefined;
  const styles = tokens.filter((token) => emphasisColor(token) === undefined);
  const color = emphasisColor(colors[0] ?? 'currentcolor');
  if (styles.length === 0) return ['none', color];
  const style = emphasisStyle(styles.join(' '));
  return style === undefined ? undefined : [style, color];
}

/**
 * CSS Text Decoration 3, section 3. The style is a keyword or a string, and
 * `text-emphasis-position` is not part of the shorthand.
 *
 * @return {PairRow}
 */
export function textEmphasisRow() {
  return {
    family: 'text-emphasis',
    longhands: {
      'text-emphasis-style': 'none',
      'text-emphasis-color': 'currentcolor',
    },
    setters: {
      'text-emphasis': {
        names: ['text-emphasis-style', 'text-emphasis-color'],
        parse: parseEmphasis,
      },
      'text-emphasis-style': sameValue(['text-emphasis-style'], emphasisStyle),
      'text-emphasis-color': sameValue(['text-emphasis-color'], emphasisColor),
    },
  };
}

const decorationLine = keywordsOf(['none', 'underline', 'overline']);
const decorationStyle = keywordsOf(['solid', 'dotted', 'wavy']);
const decorationColor = keywordsOf(['red', 'blue', 'currentcolor']);
const decorationThickness = keywordsOf(['auto', 'from-font', '2px']);

/** The grammars of the four components, in the shorthand's slot order. */
const decorationGrammars = [
  decorationLine,
  decorationStyle,
  decorationColor,
  decorationThickness,
];
const decorationInitials = ['none', 'solid', 'currentcolor', 'auto'];

/**
 * `text-decoration`: one or more line keywords, or none, and the other three
 * components in any order. Each one omitted takes its initial value.
 *
 * @param {string} value
 * @return {(string | undefined)[] | undefined}
 */
function parseDecoration(value) {
  /** @type {string[]} */
  const lines = [];
  /** @type {(string | undefined)[]} */
  const parts = [undefined, undefined, undefined, undefined];
  for (const token of tokensOf(value)) {
    const slot = decorationGrammars.findIndex(
      (grammar) => grammar(token) !== undefined
    );
    if (slot === -1) return undefined;
    if (slot === 0) {
      lines.push(token);
    } else if (parts[slot] === undefined) {
      parts[slot] = decorationGrammars[slot](token);
    } else {
      return undefined;
    }
  }
  if (lines.includes('none') && lines.length > 1) return undefined;
  if (new Set(lines).size !== lines.length) return undefined;
  if (lines.length === 0) parts[0] = 'none';
  else parts[0] = lines.length === 1 ? lines[0] : lines.join(' ');
  return parts.map((part, slot) => part ?? decorationInitials[slot]);
}

/**
 * CSS Text Decoration 4, section 2. Thickness is the newer longhand, and the
 * shorthand resets all four.
 *
 * @return {PairRow}
 */
export function textDecorationRow() {
  const names = [
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-color',
    'text-decoration-thickness',
  ];
  /** @type {Record<string, Setter>} */
  const setters = {
    'text-decoration': { names, parse: parseDecoration },
  };
  for (const [slot, name] of names.entries()) {
    setters[name] = sameValue([name], decorationGrammars[slot]);
  }
  return {
    family: 'text-decoration',
    longhands: Object.fromEntries(
      names.map((name, slot) => [name, decorationInitials[slot]])
    ),
    setters,
  };
}
