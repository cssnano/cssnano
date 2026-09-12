import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import isCustomProp from '../isCustomProp.js';
import insertCloned from '../insertCloned.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import { shorthand, initialValues, cssWideKeywords } from '../spec.js';
import { isUnresolved } from '../unresolved.js';

/** @import {Declaration, Rule} from 'postcss'; */

const { TokenType, lengthUnits, tokens } = cssnanoUtils;

const columns = 'columns';
const columnProperties = ['column-width', 'column-count'];
export const allColumnProps = new Set([columns, ...columnProperties]);
const otherColumnProperties = new Set(
  shorthand(columns).longhands.filter((p) => !allColumnProps.has(p))
);
const auto = /** @type {string} */ (initialValues.get(columnProperties[0]));

const openingTokens = new Set([
  TokenType.Function,
  TokenType.OpenParen,
  TokenType.OpenSquare,
  TokenType.OpenCurly,
]);
const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

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
    if (openingTokens.has(tokenType)) depth++;
    if (closingTokens.has(tokenType) && depth) depth--;
  }
  push();

  return { value, hasTopLevelSlash, terms };
}

/** @type {WeakMap<Declaration, { value: string, parsed: ReturnType<typeof tokenizeColumns> }>} */
const parsedDeclarations = new WeakMap();

/** @param {Declaration} d @return {ReturnType<typeof tokenizeColumns>} */
function parsedValue(d) {
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
 * Specification link: https://www.w3.org/TR/css3-multicol/
 *
 * @param {[string, string]} values
 * @return {string}
 */
function normalize([w, c]) {
  const lw = w.toLowerCase();
  const lc = c.toLowerCase();
  if (lw === auto) return c;
  if (lc === auto) return w;
  return lw === lc && cssGlobalKeywords.has(lw) ? lw : `${w} ${c}`;
}

/** @param {ReturnType<typeof tokenizeColumns>['terms'][number]} term */
function isValidLength(term) {
  const d =
    /** @type {{ value?: number, type?: string, signCharacter?: string, unit?: string } | undefined} */ (
      term.decoded
    );
  return (
    term.type === TokenType.Dimension &&
    typeof d?.unit === 'string' &&
    lengthUnits.has(d.unit.toLowerCase()) &&
    (d.type === 'integer' || d.type === 'number') &&
    typeof d.value === 'number' &&
    d.value > 0 &&
    d.signCharacter !== '-'
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
 * Takes the shorthand apart into column-width and column-count.
 * Combined with `||`, so components may appear in either order.
 *
 * @param {ReturnType<typeof tokenizeColumns>} parsed
 * @return {[string, string] | undefined}
 */
function parseColumns(parsed) {
  const values = parsed.terms;
  if (values.length > columnProperties.length) return undefined;

  /** @type {(string | undefined)[]} */
  const result = [undefined, undefined];
  /** @type {string[]} */
  const ambiguous = [];

  for (const component of values) {
    const role = componentRole(component);
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
const isValidColumns = (d) =>
  Boolean(
    d.value &&
    (isKeywordOrUnresolved(d.value.toLowerCase()) ||
      parseColumns(parsedValue(d)))
  );

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
const isInvalid = (d) =>
  !stylehacks.detect(d) &&
  (d.prop.toLowerCase() === columns
    ? !isValidColumns(d)
    : !isValidColumnProperty(d));

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} i
 * @param {string} value
 * @param {Declaration} decl
 * @param {Set<Declaration>} fallbacks
 */
function setSlot(slots, i, value, decl, fallbacks) {
  if (slots[i] && isFallback(slots[i].decl, decl)) fallbacks.add(slots[i].decl);
  slots[i] = { value, decl };
}

/**
 * @param {Rule} rule
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {boolean} lane
 */
function flush(rule, slots, contributing, fallbacks, lane) {
  if (slots.some((s) => !s || isCustomProp(s.decl))) return;
  const full = /** @type {{ value: string, decl: Declaration }[]} */ (slots);
  const s0 = mergeBlockingSupport(full[0].decl);
  const v0 = full[0].value.toLowerCase();
  const kw = cssGlobalKeywords.has(v0);
  for (const s of full) {
    const sv = s.value.toLowerCase();
    if (kw ? sv !== v0 : cssGlobalKeywords.has(sv)) return;
    if (s0.symmetricDifference(mergeBlockingSupport(s.decl)).size) return;
  }

  const shorthandVal = normalize([full[0].value, full[1].value]);
  const toRemove = Array.from(contributing).filter((d) => !fallbacks.has(d));
  if (toRemove.length === 0) return;

  if (toRemove.length === 1 && toRemove[0].prop.toLowerCase() === columns) {
    toRemove[0].prop = columns;
    toRemove[0].value = shorthandVal;
    delete toRemove[0].raws?.value;
    return;
  }

  let remSize = -(columns.length + shorthandVal.length + (lane ? 12 : 2));
  for (const d of toRemove) {
    remSize += d.prop.length + d.value.length + (d.important ? 12 : 2);
  }

  if (remSize >= 0) {
    const a = toRemove[toRemove.length - 1];
    insertCloned(rule, a, {
      prop: columns,
      value: shorthandVal,
      important: a.important,
    });
    for (const d of toRemove) d.remove();
  }
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx
 * @param {Declaration} decl
 * @return {boolean}
 */
const shouldReset = (slots, idx, decl) =>
  slots.every(Boolean) &&
  (idx === -1
    ? slots.some((s) => Boolean(s && isFallback(s.decl, decl)))
    : cssGlobalKeywords.has(decl.value.toLowerCase()) ||
      Boolean(slots[idx] && isFallback(slots[idx].decl, decl)));

/**
 * @param {Rule} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} lane
 */
function processLane(rule, laneDecls, lane) {
  /** @type {({ value: string, decl: Declaration } | null)[]} */
  let slots = [null, null];
  /** @type {Set<Declaration>} */
  const contributing = new Set();
  /** @type {Set<Declaration>} */
  const fallbacks = new Set();

  const reset = () => {
    flush(rule, slots, contributing, fallbacks, lane);
    slots = [null, null];
    contributing.clear();
    fallbacks.clear();
  };

  for (const decl of laneDecls) {
    const p = decl.prop.toLowerCase();
    const isShort = p === columns;

    if (stylehacks.detect(decl) || (isShort && !canExplode(decl))) {
      reset();
      continue;
    }

    const idx = isShort ? -1 : columnProperties.indexOf(p);
    if (shouldReset(slots, idx, decl)) reset();

    if (isShort) {
      const parsed = parseColumns(parsedValue(decl));
      if (!parsed) {
        reset();
        continue;
      }
      setSlot(slots, 0, parsed[0], decl, fallbacks);
      setSlot(slots, 1, parsed[1], decl, fallbacks);
    } else {
      setSlot(slots, idx, decl.value, decl, fallbacks);
    }
    contributing.add(decl);
  }

  flush(rule, slots, contributing, fallbacks, lane);
}

/** @param {Declaration | undefined} s */
function normalizeSingleton(s) {
  if (
    !s ||
    s.prop.toLowerCase() !== columns ||
    stylehacks.detect(s) ||
    !canExplode(s)
  ) {
    return;
  }
  const parsed = parseColumns(parsedValue(s));
  if (!parsed) return;
  const norm = normalize(parsed);
  if (s.value !== norm || s.prop !== columns) {
    s.prop = columns;
    s.value = norm;
    delete s.raws?.value;
  }
}

/**
 * @param {Rule} rule
 * @param {Declaration[]} [declarations]
 */
export function reduceColumns(rule, declarations) {
  if (!rule.nodes) return;
  const getColDecls = () =>
    /** @type {Declaration[]} */ (
      rule.nodes.filter(
        (n) => n.type === 'decl' && allColumnProps.has(n.prop.toLowerCase())
      )
    );
  const decls =
    declarations && declarations.every((d) => d.parent === rule)
      ? declarations
      : getColDecls();

  if (decls.length === 0 || decls.some(isInvalid)) return;

  cleanupDeclarations(new Set(decls), () => false);

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    normalizeSingleton(live[0]);
    return;
  }

  /** @type {[Declaration[], Declaration[]]} */
  const lanes = [[], []];
  for (const d of live) lanes[d.important ? 1 : 0].push(d);
  if (lanes[0].length) processLane(rule, lanes[0], false);
  if (lanes[1].length) processLane(rule, lanes[1], true);

  const remaining = getColDecls();
  if (remaining.length > 1) {
    cleanupDeclarations(
      new Set(remaining),
      (node, lastNode) =>
        lastNode.prop.toLowerCase() === columns &&
        node.prop.toLowerCase() !== columns &&
        !isFallback(node, lastNode) &&
        isValidColumns(lastNode)
    );
  }
}
