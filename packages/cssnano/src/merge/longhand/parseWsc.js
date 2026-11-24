import cssnanoUtils from '#utils';
import { splitComponents } from './componentRanges.js';
import { isBorderWidth, isBorderStyle, isColor } from './validateWsc.js';
import { isSubstitution } from '../../ir/unresolved.js';

const { TokenType, asciiLowerCase, decoded, tokenEnd, tokenStart } =
  cssnanoUtils;
/** @import {ValueComponent} from './componentRanges.js' */
/* The values that spell only initial components: a style `none` alone, or the
 * initial width, optionally followed by the initial style and color. A repeated
 * component such as `none none` is no such value. */
const none =
  /^[ \t\n\r\f]*(none|medium([ \t\n\r\f]+none([ \t\n\r\f]+currentcolor)?)?)[ \t\n\r\f]*$/v;

/**
 * Lowercases the ASCII letters of a component's text, keeping each dashed
 * ident as written: a custom property name is case-sensitive.
 *
 * @param {string} text the text the component spells; any other text is
 * returned as written, as its token offsets would not apply
 * @param {ValueComponent | undefined} component the component, whose tokens
 * name the dashed idents; a component without tokens has none
 * @return {string}
 */
export function lowerComponentText(text, component) {
  if (component === undefined || component.list === undefined) {
    return asciiLowerCase(text);
  }
  const list = component.list;
  if (component.start >= component.end) return asciiLowerCase(text);
  const base = tokenStart(list[component.start]);
  // Token offsets locate idents only in the component's own source slice.
  if (text.length !== tokenEnd(list[component.end - 1]) - base) return text;
  let result = '';
  let last = 0;
  for (let index = component.start; index < component.end; index++) {
    const token = list[index];
    if (token[0] !== TokenType.Ident || !decoded(token).startsWith('--')) {
      continue;
    }
    const from = tokenStart(token) - base;
    const to = tokenEnd(token) - base;
    result += asciiLowerCase(text.slice(last, from)) + text.slice(from, to);
    last = to;
  }
  return result + asciiLowerCase(text.slice(last));
}

/**
 * Parse a `<line-width> || <line-style> || <color>` value in one pass.
 *
 * The grammar requires each component at most once, and every token must
 * specify one: the browser ignores the declaration whole otherwise. Parsing
 * therefore validates — a value it rejects comes back as `null`, and callers
 * must never name a component from a rejected value.
 *
 * A substitution token may stand in for any component, so it is assigned only
 * when the value leaves exactly one slot open; where the slot is ambiguous the
 * token is left unassigned (the declaration still keeps its substitution
 * semantics for callers that track them).
 *
 * `specified` tells, per component, whether a value token named it rather than
 * a substitution filling the slot.
 *
 * The value's tokens, when the caller has them, let a component with a `(` be
 * typed without tokenizing it again.
 *
 * `parts` gives each named component's own component, so a caller can read the
 * component's tokens without splitting the value again; a component that a
 * substitution fills, or a `none`-only value's keyword, has none.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [tokens] the tokens
 * `value` spells
 * @return {{width: (string|undefined), style: (string|undefined), color: (string|undefined), specified: {width: boolean, style: boolean, color: boolean}, parts: {width: (import('./componentRanges.js').ValueComponent|undefined), style: (import('./componentRanges.js').ValueComponent|undefined), color: (import('./componentRanges.js').ValueComponent|undefined)}} | null}
 */
function parseWidthStyleColor(value, tokens) {
  if (none.test(asciiLowerCase(value))) {
    return {
      width: 'medium',
      style: 'none',
      color: 'currentcolor',
      specified: { width: true, style: true, color: true },
      parts: { width: undefined, style: undefined, color: undefined },
    };
  }

  let width, style, color;
  /** @type {string[]} */
  const substitutions = [];
  let count = 0;
  let specified = 0;
  let substituted = false;
  const named = { width: false, style: false, color: false };
  /** @type {{width: ValueComponent | undefined, style: ValueComponent | undefined, color: ValueComponent | undefined}} */
  const parts = { width: undefined, style: undefined, color: undefined };

  for (const component of splitComponents(value, tokens)) {
    const { raw: text, list: part, start, end } = component;
    count++;
    if (isBorderStyle(text)) {
      if (style !== undefined) return null;
      specified++;
      named.style = true;
      parts.style = component;
      style = lowerComponentText(text, component);
    } else if (isBorderWidth(text, part, start, end)) {
      if (width !== undefined) return null;
      specified++;
      named.width = true;
      parts.width = component;
      width = lowerComponentText(text, component);
    } else if (isColor(text, part, start, end)) {
      if (color !== undefined) return null;
      specified++;
      named.color = true;
      parts.color = component;
      color = lowerComponentText(text, component);
    } else if (isSubstitution(part, start, end)) {
      substituted = true;
      substitutions.push(text);
    } else {
      return null;
    }
  }

  if (count > 3) return null;

  // A substitution fills whichever component is still open only when that
  // component is unambiguous; its spelling is kept as written.
  if (substituted && specified === 2) {
    const substitution = substitutions[0];
    if (width === undefined) {
      width = substitution;
    } else if (style === undefined) {
      style = substitution;
    } else {
      color = substitution;
    }
  }

  return { width, style, color, specified: named, parts };
}

export default parseWidthStyleColor;
