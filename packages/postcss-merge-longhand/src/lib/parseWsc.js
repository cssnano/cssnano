import { list } from 'postcss';
import cssnanoUtils from 'cssnano-utils';
import { isBorderWidth, isBorderStyle, isColor } from './validateWsc.js';
import { isSubstitution } from './unresolved.js';

const { asciiLowerCase } = cssnanoUtils;
const none =
  /^[ \t\n\r\f]*(none|medium)([ \t\n\r\f]+none([ \t\n\r\f]+(none|currentcolor))?)?[ \t\n\r\f]*$/v;

/* Approximate https://drafts.csswg.org/css-values-4/#typedef-dashed-ident */
// eslint-disable-next-line no-control-regex
const varRE = /--(\w|-|[^\x00-\x7F])+/gv;
/** @type {(v: string) => string} */
const toLower = (v) => {
  let match;
  let lastIndex = 0;
  let result = '';
  varRE.lastIndex = 0;
  while ((match = varRE.exec(v)) !== null) {
    if (match.index > lastIndex) {
      result += v.substring(lastIndex, match.index).toLowerCase();
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < v.length) {
    result += v.substring(lastIndex).toLowerCase();
  }
  if (result === '') {
    return v;
  }
  return result;
};

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
 * @param {string} value
 * @return {{width: (string|undefined), style: (string|undefined), color: (string|undefined)} | null}
 */
function parseWidthStyleColor(value) {
  if (none.test(asciiLowerCase(value))) {
    return { width: 'medium', style: 'none', color: 'currentcolor' };
  }

  let width, style, color;
  /** @type {string[]} */
  const substitutions = [];
  let tokens = 0;
  let specified = 0;
  let substituted = false;

  for (const v of list.space(value)) {
    tokens++;
    if (isBorderStyle(v)) {
      if (style !== undefined) return null;
      specified++;
      style = toLower(v);
    } else if (isBorderWidth(v)) {
      if (width !== undefined) return null;
      specified++;
      width = toLower(v);
    } else if (isColor(v)) {
      if (color !== undefined) return null;
      specified++;
      color = toLower(v);
    } else if (isSubstitution(v)) {
      substituted = true;
      substitutions.push(v);
    } else {
      return null;
    }
  }

  if (tokens > 3) return null;

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

  return { width, style, color };
}

export { toLower };
export default parseWidthStyleColor;
