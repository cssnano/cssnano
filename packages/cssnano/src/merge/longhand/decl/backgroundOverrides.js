import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
import { withoutVendorPrefix } from '../../../ir/vendorPrefix.js';
import { RUN_END } from '../blockDeclarations.js';
import { splitValue } from '../valueComponents.js';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { needsUnmetSupport } from '../isFallback.js';
import { longstandingFeatures } from '../../../run/syntaxFeatures.js';
import { namedColors } from '../../../ir/spec.js';
import { decodedPropertyName, isAll } from './importanceLanes.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js' */
/** @import {Component} from '../valueComponents.js' */

const { TokenType, asciiLowerCase, isHexColorDigits } = cssnanoUtils;

/* The value a longhand has once the shorthand has set it. Position and size
 * are never set by a shorthand that is parsed, so they only keep an omitted
 * value, which `initial` names. */
const initialValues = new Map([
  ['background-color', 'transparent'],
  ['background-image', 'none'],
  ['background-repeat', 'repeat'],
  ['background-attachment', 'scroll'],
  ['background-origin', 'padding-box'],
  ['background-clip', 'border-box'],
  ['background-position', 'initial'],
  ['background-size', 'initial'],
]);

const repeatKeywords = new Set([
  'repeat-x',
  'repeat-y',
  'repeat',
  'space',
  'round',
  'no-repeat',
]);
const attachmentKeywords = new Set(['scroll', 'fixed', 'local']);
const boxKeywords = new Set(['border-box', 'padding-box', 'content-box']);

/**
 * The state of one importance lane: the value each longhand has had since the
 * last parsed shorthand. A missing entry is an unknown value, so an empty map
 * means no shorthand is in force.
 *
 * @typedef {Map<string, string>} LaneState
 */

/**
 * Spells a run of tokens, ASCII-case-folded where CSS compares case-insensitively.
 *
 * @param {readonly CSSToken[]} list
 * @param {number} start
 * @param {number} end exclusive
 * @return {string}
 */
function spell(list, start, end) {
  let text = '';
  for (let index = start; index < end; index++) {
    const token = list[index];
    const folds =
      token[0] === TokenType.Ident ||
      token[0] === TokenType.Function ||
      token[0] === TokenType.Hash;
    text += folds ? asciiLowerCase(token[1]) : token[1];
  }
  return text;
}

/**
 * Transparent black is the initial colour, so its spellings are one value.
 *
 * @param {string} prop
 * @param {string} text - folded
 * @return {string}
 */
function canonicalValue(prop, text) {
  if (
    prop === 'background-color' &&
    (text === '#0000' || text === '#00000000')
  ) {
    return 'transparent';
  }
  return text;
}

/**
 * A colour every target parses. Support for colour functions, newer keywords
 * and system colours is not fully modelled, and a target that rejects the
 * colour ignores the whole shorthand.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
function isLongstandingColor(token) {
  if (token[0] === TokenType.Hash) return isHexColorDigits(token[4].value);
  if (token[0] !== TokenType.Ident) return false;
  const name = asciiLowerCase(token[4].value);
  if (name === 'currentcolor') return true;
  return name !== 'rebeccapurple' && namedColors.has(name);
}

/**
 * Whether a component is one `url()` and nothing else. CSS needs no space
 * between components, so `url(a)red` is an image and a colour.
 *
 * @param {readonly CSSToken[]} list
 * @param {number} start
 * @param {number} end exclusive
 * @return {boolean}
 */
function isSingleUrl(list, start, end) {
  const first = list[start];
  if (first[0] === TokenType.URL) return end - start === 1;
  return (
    end - start === 3 &&
    first[0] === TokenType.Function &&
    asciiLowerCase(first[4].value) === 'url' &&
    list[start + 1][0] === TokenType.String &&
    list[start + 2][0] === TokenType.CloseParen
  );
}

/**
 * The value a component of the shorthand sets, or undefined when the component
 * is not one the shorthand's grammar names.
 *
 * @param {Component} component
 * @return {{prop: string, value: string} | undefined}
 */
function componentValue({ list, start, end }) {
  const first = list[start];
  if (end - start === 1 && first[0] === TokenType.Ident) {
    const name = asciiLowerCase(first[4].value);
    if (name === 'none') return { prop: 'background-image', value: name };
    if (repeatKeywords.has(name))
      return { prop: 'background-repeat', value: name };
    if (attachmentKeywords.has(name))
      return { prop: 'background-attachment', value: name };
    if (boxKeywords.has(name)) return { prop: 'box', value: name };
  }
  if (isSingleUrl(list, start, end)) {
    return { prop: 'background-image', value: spell(list, start, end) };
  }
  if (end - start === 1 && isLongstandingColor(first)) {
    return { prop: 'background-color', value: spell(list, start, end) };
  }
  return undefined;
}

/**
 * Parses a single-layer `background` shorthand whose every component names one
 * of the longhands it resets. Position, size, a `/`, a second colour or image,
 * and any other component are not parsed, so they return null.
 *
 * @param {DeclarationItem} node
 * @param {LaneState} lane - empty; receives the value of each reset longhand,
 * or stays empty when the shorthand is not parsed
 * @return {void}
 */
function parseShorthand(node, lane) {
  // A comma makes a second layer, which this parser does not read.
  const parts = splitValue(node.value, ',', node.tokens);
  if (parts?.length !== 1) return;
  const [{ components }] = parts;
  if (components.length === 0) return;
  /** @type {Map<string, string>} */
  const values = new Map();
  /** @type {string[]} */
  const boxes = [];
  for (const component of components) {
    const parsed = componentValue(component);
    if (parsed === undefined) return;
    if (parsed.prop === 'box') {
      if (boxes.length === 2) return;
      boxes.push(parsed.value);
      continue;
    }
    if (values.has(parsed.prop)) return;
    values.set(parsed.prop, canonicalValue(parsed.prop, parsed.value));
  }
  for (const [prop, initial] of initialValues) {
    lane.set(prop, values.get(prop) ?? initial);
  }
  if (boxes.length > 0) {
    lane.set('background-origin', boxes[0]);
    lane.set('background-clip', boxes[boxes.length - 1]);
  }
}

/**
 * The value a longhand declaration spells, with `initial` standing for the
 * longhand's initial value, or undefined when the value has a comment.
 *
 * @param {DeclarationItem} node
 * @param {string} prop - lowercased
 * @return {string | undefined}
 */
function longhandValue(node, prop) {
  const tokens = node.tokens;
  let start = 0;
  let end = tokens.length;
  while (start < end && tokens[start][0] === TokenType.Whitespace) start++;
  while (end > start && tokens[end - 1][0] === TokenType.Whitespace) end--;
  if (start === end) return undefined;
  for (let index = start; index < end; index++) {
    if (tokens[index][0] === TokenType.Comment) return undefined;
  }
  const text = spell(tokens, start, end);
  if (isCssWideKeyword(text)) {
    return text === 'initial' ? initialValues.get(prop) : undefined;
  }
  return canonicalValue(prop, text);
}

/**
 * Drops a later `background-*` longhand that repeats what the nearest
 * `background` shorthand of the same importance already set. Every other
 * `background` declaration, prefixed or not, resets what it may affect.
 *
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export function discardRedundantBackgroundLonghands(list, features) {
  // Below the floor, a target may lack the CSS 3 keywords the parser accepts.
  if (!longstandingFeatures.isSubsetOf(features)) return;
  /** @type {[LaneState, LaneState]} */
  const lanes = [new Map(), new Map()];
  for (const position of list.chain) {
    if (position === RUN_END) {
      resetLanes(lanes);
      continue;
    }
    const node = list.at(position);
    if (node.removed) continue;
    if (isAll(node) || node.kept) {
      resetLanes(lanes);
      continue;
    }
    const lane = lanes[node.important ? 1 : 0];
    if (node.prop.startsWith('--')) continue;
    if (!observe(node, lane, features)) continue;
    list.remove(position);
  }
}

/** @param {[LaneState, LaneState]} lanes */
function resetLanes(lanes) {
  for (const lane of lanes) lane.clear();
}

/**
 * Records a declaration's effect on its lane. Returns whether it is a
 * redundant longhand, which the caller removes.
 *
 * @param {DeclarationItem} node
 * @param {LaneState} lane
 * @param {ReadonlySet<string>} features
 * @return {boolean}
 */
function observe(node, lane, features) {
  // Engines match a property by its unescaped name, so `b\61 ckground` counts.
  const prop = node.prop.includes('\\')
    ? decodedPropertyName(node.prop)
    : asciiLowerCase(node.prop);
  if (prop === undefined) return false;
  if (prop === 'background') {
    lane.clear();
    if (hasHack(node.before, node.prop, node.value)) return false;
    // A shorthand some target ignores leaves the longhands it would set alone.
    if (needsUnmetSupport(node, features)) return false;
    parseShorthand(node, lane);
    return false;
  }
  if (!initialValues.has(prop)) {
    // Any other declaration in the background family may set a longhand.
    if (withoutVendorPrefix(prop).startsWith('background')) lane.clear();
    return false;
  }
  const known = lane.get(prop);
  /* An equal value changes nothing, even where a browser ignores the longhand:
   * the shorthand's value stands either way. */
  const redundant =
    known !== undefined &&
    known === longhandValue(node, prop) &&
    !hasHack(node.before, node.prop, node.value);
  if (redundant) return true;
  lane.delete(prop);
  return false;
}
