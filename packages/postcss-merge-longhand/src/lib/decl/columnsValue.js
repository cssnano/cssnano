import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import { shorthand, initialValues, cssWideKeywords } from '../spec.js';
import { isLengthValue } from '../lengthGrammar.js';
import { isUnresolved } from '../unresolved.js';
import { closingTokens } from '../valueComponents.js';

/** @import {Declaration} from 'postcss'; */

const { TokenType, closeForOpening, tokens } = cssnanoUtils;

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

/**
 * @param {string} value
 * @return {{ value: string, hasTopLevelSlash: boolean, terms: { start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown }[] }}
 */
function tokenizeColumns(value) {
  /** @type {{ start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown }[]} */
  const terms = [];
  let start = -1,
    end = -1,
    tokenCount = 0,
    depth = 0;
  let type = TokenType.EOF;
  /** @type {unknown} */
  let decoded;
  let hasTopLevelSlash = false;

  const push = () => {
    if (tokenCount) {
      terms.push({ start, end, tokenCount, type, decoded });
      start = -1;
      tokenCount = 0;
      decoded = undefined;
    }
  };

  for (const token of tokens(value)) {
    const tokenType = token[0];
    if (tokenType === TokenType.EOF) continue;
    if (depth === 0 && tokenType === TokenType.Whitespace) {
      push();
      continue;
    }
    if (tokenCount === 0) {
      start = token[2];
      type = /** @type {import('@csstools/css-tokenizer').TokenType} */ (
        tokenType
      );
      decoded = token[4];
    }
    if (depth === 0 && tokenType === TokenType.Delim && token[1] === '/') {
      hasTopLevelSlash = true;
    }
    tokenCount++;
    end = token[3] + 1;
    if (closeForOpening(tokenType) !== undefined) {
      depth++;
    } else if (depth > 0 && closingTokens.has(tokenType)) {
      depth--;
    }
  }
  push();

  return { value, hasTopLevelSlash, terms };
}

/** @type {WeakMap<Declaration, { value: string, parsed: ReturnType<typeof tokenizeColumns> }>} */
const parsedDeclarations = new WeakMap();

/** @param {Declaration} d @return {ReturnType<typeof tokenizeColumns>} */
export function parsedValue(d) {
  let cached = parsedDeclarations.get(d);
  if (!cached || cached.value !== d.value) {
    cached = { value: d.value, parsed: tokenizeColumns(d.value) };
    parsedDeclarations.set(d, cached);
  }
  return cached.parsed;
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
  const lw = w.toLowerCase();
  const lc = c.toLowerCase();
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
    d.value.toLowerCase() === auto
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
 * @param {Declaration} declaration
 * @return {boolean}
 */
export const setsOtherColumnProperty = (declaration) =>
  otherColumnProperties.has(declaration.prop.toLowerCase()) ||
  (declaration.prop.toLowerCase() === columns &&
    parsedValue(declaration).hasTopLevelSlash);

/** @param {string} v @return {boolean} */
const isKeywordOrUnresolved = (v) =>
  v === auto || cssWideKeywords.has(v) || isUnresolved(v);

/** @param {Declaration} d @return {boolean} */
export function isValidColumns(d) {
  if (!d.value) return false;
  const parsed = parsedValue(d);
  const roles = termRoles(parsed);
  if (parseColumns(parsed, roles)) return true;
  if (parsed.hasTopLevelSlash) return true;

  if (parsed.terms.length === 1) {
    const val = parsed.value
      .slice(parsed.terms[0].start, parsed.terms[0].end)
      .toLowerCase();
    return isKeywordOrUnresolved(val) || roles[0] !== undefined;
  }

  if (parsed.terms.length === 2) {
    /** @type {('width' | 'count' | 'initial' | 'unresolved')[]} */
    const pairRoles = [];
    for (const [position, term] of parsed.terms.entries()) {
      const role = roles[position];
      if (role !== undefined) {
        pairRoles.push(role);
      } else {
        const val = parsed.value.slice(term.start, term.end).toLowerCase();
        // CSS-wide keywords cannot combine with other tokens (CSS Cascading 4
        // § 7.2); only unresolved functions keep a two-term value valid.
        if (isUnresolved(val)) {
          pairRoles.push('unresolved');
        } else {
          return false;
        }
      }
    }
    if (pairRoles[0] === 'width' && pairRoles[1] === 'width') return false;
    if (pairRoles[0] === 'count' && pairRoles[1] === 'count') return false;
    return true;
  }

  return false;
}

/** @param {Declaration} d @return {boolean} */
function isValidColumnProperty(d) {
  const value = d.value?.toLowerCase();
  if (!value) return false;
  if (isKeywordOrUnresolved(value)) return true;
  const parsed = parsedValue(d);
  return (
    parsed.terms.length === 1 &&
    componentRole(parsed.terms[0]) ===
      (d.prop.toLowerCase() === 'column-width' ? 'width' : 'count')
  );
}

/** @param {Declaration} d @return {boolean} */
export const isInvalid = (d) =>
  !stylehacks.detect(d) &&
  (d.prop.toLowerCase() === columns
    ? !isValidColumns(d)
    : !isValidColumnProperty(d));
