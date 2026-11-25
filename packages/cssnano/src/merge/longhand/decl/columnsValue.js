import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
import { shorthand, initialValues, cssWideKeywords } from '../../../ir/spec.js';
import { isLengthValue } from '../lengthGrammar.js';
import { isFunctionOfType, mathType } from '../mathType.js';
import { closingTokens } from '../valueComponents.js';

/** @import {DeclarationItem} from '../blockDeclarations.js'; */

const { TokenType, asciiLowerCase, closeForOpening } = cssnanoUtils;

export const columns = 'columns';
const columnProperties = ['column-width', 'column-count'];
/** Slot of each longhand in the parsed `columns` value. */
export const columnSlots = new Map(
  columnProperties.map((name, slot) => [name, slot])
);
export const allColumnProps = new Set([columns, ...columnProperties]);
const otherColumnProperties = new Set(
  shorthand(columns).longhands.filter((p) => !allColumnProps.has(p))
);
const auto = /** @type {string} */ (initialValues.get(columnProperties[0]));

/** The term being read, and the terms read before it. */
class TermScan {
  constructor() {
    /** @type {{ start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown }[]} */
    this.terms = [];
    this.start = -1;
    this.end = -1;
    this.tokenCount = 0;
    this.type = TokenType.EOF;
    /** @type {unknown} */
    this.decoded = undefined;
  }

  /** Ends the term, if any token has started one. */
  close() {
    if (!this.tokenCount) return;
    this.terms.push({
      start: this.start,
      end: this.end,
      tokenCount: this.tokenCount,
      type: this.type,
      decoded: this.decoded,
    });
    this.start = -1;
    this.tokenCount = 0;
    this.decoded = undefined;
  }
}

/**
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} list the tokens of `value`
 * @return {{ value: string, hasTopLevelSlash: boolean, terms: { start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown }[] }}
 */
function tokenizeColumns(value, list) {
  const scan = new TermScan();
  let depth = 0;
  let hasTopLevelSlash = false;

  for (const token of list) {
    const tokenType = token[0];
    if (tokenType === TokenType.EOF) continue;
    if (depth === 0 && tokenType === TokenType.Whitespace) {
      scan.close();
      continue;
    }
    if (scan.tokenCount === 0) {
      scan.start = token[2];
      scan.type = /** @type {import('@csstools/css-tokenizer').TokenType} */ (
        tokenType
      );
      scan.decoded = token[4];
    }
    if (depth === 0 && tokenType === TokenType.Delim && token[1] === '/') {
      hasTopLevelSlash = true;
    }
    scan.tokenCount++;
    scan.end = token[3] + 1;
    if (closeForOpening(tokenType) !== undefined) {
      depth++;
    } else if (depth > 0 && closingTokens.has(tokenType)) {
      depth--;
    }
  }
  scan.close();
  const { terms } = scan;

  return { value, hasTopLevelSlash, terms };
}

/**
 * @param {DeclarationItem} d
 * @return {ReturnType<typeof tokenizeColumns>}
 */
export function parsedValue(d) {
  return tokenizeColumns(d.value, d.tokens);
}

/**
 * Normalize a columns shorthand definition. Both longhand initial values
 * are 'auto', and omitted values reset to initial, so 'auto' can be dropped.
 *
 * Specification links: https://www.w3.org/TR/css-multicol-2/#columns
 * and https://www.w3.org/TR/css-sizing-4/#column-sizing
 *
 * @param {[string, string]} values
 * @return {string}
 */
export function normalize([w, c]) {
  const lw = asciiLowerCase(w);
  const lc = asciiLowerCase(c);
  if (lw === auto && lc === auto) return auto;
  if (lw === auto) return c;
  if (lc === auto) return w;
  return lw === lc && cssWideKeywords.has(lw) ? lw : `${w} ${c}`;
}

/**
 * A `<length [0,∞]>`: CSS Sizing 4 allows a zero `column-width`.
 *
 * @param {ReturnType<typeof tokenizeColumns>['terms'][number]} term
 */
function isValidLength(term) {
  const d =
    /** @type {{ value?: number, type?: string, signCharacter?: string, unit?: string } | undefined} */ (
      term.decoded
    );
  return (
    term.type === TokenType.Dimension &&
    typeof d?.unit === 'string' &&
    typeof d.value === 'number' &&
    isLengthValue(d.value, d.unit, false, true)
  );
}

/**
 * The component a value can only have come from: `column-width` takes a
 * length, `column-count` an integer, and `auto` fits either.
 *
 * @param {ReturnType<typeof tokenizeColumns>['terms'][number]} term
 * @return {'width' | 'count' | 'initial' | undefined}
 */
function componentRole(term) {
  if (term.tokenCount !== 1) return undefined;
  const d =
    /** @type {{ value?: number | string, type?: string, signCharacter?: string } | undefined} */ (
      term.decoded
    );
  if (
    term.type === TokenType.Ident &&
    typeof d?.value === 'string' &&
    asciiLowerCase(d.value) === auto
  ) {
    return 'initial';
  }
  if (
    term.type === TokenType.Number &&
    d?.type === 'integer' &&
    d.signCharacter !== '-' &&
    typeof d.value === 'number' &&
    d.value > 0 &&
    d.value <= Number.MAX_SAFE_INTEGER
  ) {
    return 'count';
  }
  return isValidLength(term) ? 'width' : undefined;
}

/**
 * @param {ReturnType<typeof tokenizeColumns>} parsed
 * @return {('width' | 'count' | 'initial' | undefined)[]}
 */
function termRoles(parsed) {
  return parsed.terms.map(componentRole);
}

/**
 * Takes the shorthand apart into column-width and column-count.
 * Combined with `||`, so components may appear in either order.
 *
 * @param {ReturnType<typeof tokenizeColumns>} parsed
 * @param {('width' | 'count' | 'initial' | undefined)[]} [roles]
 * @return {[string, string] | undefined}
 */
export function parseColumns(parsed, roles = termRoles(parsed)) {
  const values = parsed.terms;
  if (values.length > columnProperties.length) return undefined;

  /** @type {(string | undefined)[]} */
  const result = [undefined, undefined];
  /** @type {string[]} */
  const ambiguous = [];

  for (const [position, component] of values.entries()) {
    /** @type {'width' | 'count' | 'initial' | undefined} */
    const role = roles[position];
    if (role === undefined) return undefined;

    const val = parsed.value.slice(component.start, component.end);
    if (role === 'initial') {
      ambiguous.push(val);
      continue;
    }

    const index = role === 'width' ? 0 : 1;
    if (result[index] !== undefined) return undefined;
    result[index] = val;
  }

  for (const component of ambiguous) {
    const free = result.indexOf(undefined);
    if (free === -1) return undefined;
    result[free] = component;
  }

  return /** @type {[string, string]} */ (
    result.map((component) => component ?? auto)
  );
}

/**
 * Check if a declaration sets column properties beyond column-width/count.
 * The `columns: <width> / <height>` form sets column-height via top-level slash.
 *
 * @param {DeclarationItem} declaration
 * @return {boolean}
 */
export const setsOtherColumnProperty = (declaration) =>
  otherColumnProperties.has(asciiLowerCase(declaration.prop)) ||
  (asciiLowerCase(declaration.prop) === columns &&
    parsedValue(declaration).hasTopLevelSlash);

/* A count is an integer, which a calculation of a number rounds to. */
const widthTypes = /** @type {const} */ (['length']);
const countTypes = /** @type {const} */ (['number']);
const eitherTypes = /** @type {const} */ (['length', 'number']);

/**
 * @param {string} text
 * @param {readonly ('number' | 'length')[]} types what the component's grammar takes
 * @return {boolean}
 */
const isUnresolvedText = (text, types) => {
  // Without a `(` there is no function to be unresolved.
  if (!text.includes('(')) return false;
  const spelled = cssnanoUtils.tokens(text);
  return isFunctionOfType(spelled, 0, spelled.length, types);
};

/**
 * @param {string} v
 * @param {readonly ('number' | 'length')[]} types
 * @return {boolean}
 */
const isKeywordOrUnresolved = (v, types) =>
  v === auto || cssWideKeywords.has(v) || isUnresolvedText(v, types);

/**
 * The role of a function component in a two-term value: a substitution stays
 * unresolved, and a math function takes the type it computes. Any other type
 * makes the value invalid.
 *
 * @param {string} text
 * @return {'width' | 'count' | 'unresolved' | undefined}
 */
function functionRole(text) {
  if (!isUnresolvedText(text, eitherTypes)) return undefined;
  const spelled = cssnanoUtils.tokens(text);
  if (isFunctionOfType(spelled, 0, spelled.length, [])) return 'unresolved';
  const type = mathType(spelled, 0, spelled.length);
  if (type === 'length') return 'width';
  if (type === 'number') return 'count';
  return undefined;
}

/**
 * @param {DeclarationItem} d
 * @return {boolean}
 */
export function isValidColumns(d) {
  if (!d.value) return false;
  const parsed = parsedValue(d);
  const roles = termRoles(parsed);
  if (parseColumns(parsed, roles)) return true;
  if (parsed.hasTopLevelSlash) return true;

  if (parsed.terms.length === 1) {
    const val = asciiLowerCase(
      parsed.value.slice(parsed.terms[0].start, parsed.terms[0].end)
    );
    return isKeywordOrUnresolved(val, eitherTypes) || roles[0] !== undefined;
  }

  if (parsed.terms.length === 2) {
    /** @type {('width' | 'count' | 'initial' | 'unresolved')[]} */
    const pairRoles = [];
    for (const [position, term] of parsed.terms.entries()) {
      const role = roles[position];
      if (role !== undefined) {
        pairRoles.push(role);
      } else {
        const val = asciiLowerCase(parsed.value.slice(term.start, term.end));
        // CSS-wide keywords cannot combine with other tokens (CSS Cascading 4
        // § 7.2); only functions keep a two-term value valid.
        const fnRole = functionRole(val);
        if (fnRole === undefined) return false;
        pairRoles.push(fnRole);
      }
    }
    if (pairRoles[0] === 'width' && pairRoles[1] === 'width') return false;
    if (pairRoles[0] === 'count' && pairRoles[1] === 'count') return false;
    return true;
  }

  return false;
}

/**
 * @param {DeclarationItem} d
 * @return {boolean}
 */
function isValidColumnProperty(d) {
  const value = asciiLowerCase(d.value);
  if (!value) return false;
  const isWidth = asciiLowerCase(d.prop) === 'column-width';
  if (isKeywordOrUnresolved(value, isWidth ? widthTypes : countTypes)) {
    return true;
  }
  const parsed = parsedValue(d);
  return (
    parsed.terms.length === 1 &&
    componentRole(parsed.terms[0]) === (isWidth ? 'width' : 'count')
  );
}

/**
 * @param {DeclarationItem} d
 * @return {boolean}
 */
export const isInvalid = (d) =>
  !hasHack(d.before, d.prop, d.value) &&
  (asciiLowerCase(d.prop) === columns
    ? !isValidColumns(d)
    : !isValidColumnProperty(d));
