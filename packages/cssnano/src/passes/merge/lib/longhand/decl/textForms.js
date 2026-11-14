import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { isColor } from '../validateWsc.js';
import { isLengthValue, parseDimension } from '../lengthGrammar.js';
import {
  componentTokens,
  family,
  keywordParser,
  ruleComponent,
} from './pairFamilyBuilders.js';

/** @import {PairFamily, Parser} from './pairForms.js'; */

const { asciiLowerCase, TokenType } = cssnanoUtils;

const emphasisFills = new Set(['filled', 'open']);
const emphasisShapes = new Set([
  'dot',
  'circle',
  'double-circle',
  'triangle',
  'sesame',
]);

/**
 * `none`, a string, or one fill and one shape in either order, each optional
 * but not both missing. The fill's default is filled, so a lone shape is
 * valid. A value of any other form is left as written.
 *
 * @type {Parser}
 */
function emphasisStyle(decl) {
  const trimmed = decl.value.trim();
  if (isCssWideKeyword(trimmed)) return trimmed;
  const tokens = componentTokens(decl);
  if (tokens === undefined) return null;
  if (tokens.length === 1 && tokens[0][0] === TokenType.String) return trimmed;
  if (tokens.some((token) => token[0] !== TokenType.Ident)) return null;
  const words = tokens.map((token) => asciiLowerCase(token[1]));
  if (words.length === 1 && words[0] === 'none') return trimmed;
  let fills = 0;
  let shapes = 0;
  for (const word of words) {
    if (emphasisFills.has(word)) fills++;
    else if (emphasisShapes.has(word)) shapes++;
    else return null;
  }
  return fills <= 1 && shapes <= 1 ? trimmed : null;
}

/**
 * The style, then the color, each omitted at its initial value: none and
 * currentcolor. A value with neither keeps `none`, which the shorthand needs.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitTextEmphasis([style, color]) {
  const components = [];
  if (asciiLowerCase(style) !== 'none') components.push(style);
  if (asciiLowerCase(color) !== 'currentcolor') components.push(color);
  return components.length ? components.join(' ') : 'none';
}

/** @type {PairFamily} */
export const textEmphasisFamily = family(
  'text-emphasis',
  ['text-emphasis-style', 'text-emphasis-color'],
  {
    parseValue: [emphasisStyle, ruleComponent(isColor)],
    emit: emitTextEmphasis,
  }
);

const decorationLines = new Set([
  'underline',
  'overline',
  'line-through',
  'blink',
]);

/**
 * `none`, or one to four different line keywords. The spelling and grammar
 * error keywords are left as written.
 *
 * @type {Parser}
 */
function decorationLine(decl) {
  const trimmed = decl.value.trim();
  if (isCssWideKeyword(trimmed)) return trimmed;
  const tokens = componentTokens(decl);
  if (tokens === undefined) return null;
  const words = tokens.map((token) => asciiLowerCase(token[1]));
  if (words.length === 1 && words[0] === 'none') return trimmed;
  if (words.length > decorationLines.size) return null;
  const distinct = new Set(words);
  if (distinct.size !== words.length) return null;
  return words.every((word) => decorationLines.has(word)) ? trimmed : null;
}

/**
 * `auto`, `from-font`, or a non-negative length or percentage.
 *
 * @param {string} text
 * @return {boolean}
 */
function isThickness(text) {
  const lower = asciiLowerCase(text);
  if (lower === 'auto' || lower === 'from-font') return true;
  const dimension = parseDimension(lower);
  return (
    dimension !== undefined &&
    isLengthValue(dimension.number, dimension.unit, true, true)
  );
}

/**
 * The line, the style, the color and the thickness, each omitted at its
 * initial value. Nothing left is written as `none`, the shorthand's own
 * initial value.
 *
 * @param {string[]} values
 * @return {string}
 */
function emitDecoration([line, style, color, thickness]) {
  const components = [];
  if (asciiLowerCase(line) !== 'none') components.push(line);
  if (asciiLowerCase(style) !== 'solid') components.push(style);
  if (asciiLowerCase(color) !== 'currentcolor') components.push(color);
  if (asciiLowerCase(thickness) !== 'auto') components.push(thickness);
  return components.length ? components.join(' ') : 'none';
}

/**
 * An engine that parses the shorthand without the style or color, or without
 * the thickness, drops the whole declaration, so each one emitted needs its
 * feature.
 *
 * @param {string[]} values
 * @return {string[]}
 */
function decorationFeatures([, style, color, thickness]) {
  const features = [];
  if (
    asciiLowerCase(style) !== 'solid' ||
    asciiLowerCase(color) !== 'currentcolor'
  ) {
    features.push('keyword:text-decoration-color-and-style');
  }
  if (asciiLowerCase(thickness) !== 'auto') {
    features.push('keyword:text-decoration-thickness');
  }
  return features;
}

/** @type {PairFamily} */
export const textDecorationFamily = family(
  'text-decoration',
  [
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-color',
    'text-decoration-thickness',
  ],
  {
    parseValue: [
      decorationLine,
      keywordParser(new Set(['solid', 'double', 'dotted', 'dashed', 'wavy'])),
      ruleComponent(isColor),
      ruleComponent((text) => isThickness(text)),
    ],
    emit: emitDecoration,
    requires: decorationFeatures,
  }
);
