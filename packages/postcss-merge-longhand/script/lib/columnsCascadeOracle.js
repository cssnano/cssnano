import assert from 'node:assert/strict';
import postcss from 'postcss';
import { reduceColumns } from '../../src/lib/decl/columns.js';

/**
 * Independent computed-state cascade oracle for column-width and column-count.
 * Deliberately models the CSS cascade rules, importance lanes, and support
 * environments without depending on cssnano internals or regex shorthand matching.
 */

export const CSS_WIDE = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
]);
export const COUNT_RE = /^\+?[1-9]\d*$/;
export const LENGTH_RE =
  /^\+?(?:\d*\.\d+|\d+)(px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q)$/i;

/**
 * Splits CSS declaration values respecting nested function boundaries.
 * @param {string} value
 * @return {string[]}
 */
export function tokenizeValue(value) {
  /** @type {string[]} */
  const tokens = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth > 0) depth--;
      current += ch;
    } else if (depth === 0 && /\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

/**
 * Checks whether all functions in a value are supported in the given environment.
 * @param {string} token
 * @param {{ env?: boolean, var?: boolean, calc?: boolean }} env
 * @return {boolean}
 */
export function isSupported(token, env) {
  const matches = token.match(/([a-zA-Z_-][\w-]*)\s*\(/g);
  if (!matches) return true;
  for (const m of matches) {
    const fn = m.slice(0, m.indexOf('(')).trim().toLowerCase();
    if (fn === 'env' && !env.env) return false;
    if (fn === 'var' && !env.var) return false;
    if (fn === 'calc' && !env.calc) return false;
  }
  return true;
}

/**
 * Classifies a token independently according to CSS Multi-column specification.
 * @param {string} token
 * @return {'auto' | 'css-wide' | 'count' | 'width' | 'substitution' | 'invalid'}
 */
export function classifyToken(token) {
  const lower = token.toLowerCase();
  if (lower === 'auto') return 'auto';
  if (CSS_WIDE.has(lower)) return 'css-wide';
  if (COUNT_RE.test(token)) return 'count';
  if (LENGTH_RE.test(token)) return 'width';
  if (/^calc\(/i.test(token)) return 'width';
  if (/^(?:var|env)\(/i.test(token)) return 'substitution';
  return 'invalid';
}

/**
 * Independently parses a single-token `columns` shorthand value into width and count slots.
 * @param {string} t
 * @return {{ width?: string, count?: string } | null}
 */
export function parseSingleTokenShorthand(t) {
  const role = classifyToken(t);
  if (role === 'css-wide')
    return { width: t.toLowerCase(), count: t.toLowerCase() };
  if (role === 'auto') return { width: 'auto', count: 'auto' };
  if (role === 'width' || role === 'substitution')
    return { width: t, count: 'auto' };
  if (role === 'count') return { width: 'auto', count: t };
  return null;
}

/**
 * Independently parses a two-token `columns` shorthand value into width and count slots.
 * @param {string} t0
 * @param {string} t1
 * @return {{ width?: string, count?: string } | null}
 */
export function parseTwoTokenShorthand(t0, t1) {
  const r0 = classifyToken(t0);
  const r1 = classifyToken(t1);

  if (
    r0 === 'invalid' ||
    r1 === 'invalid' ||
    r0 === 'css-wide' ||
    r1 === 'css-wide' ||
    (r0 === 'width' && r1 === 'width') ||
    (r0 === 'count' && r1 === 'count')
  ) {
    return null;
  }

  let width = 'auto';
  let count = 'auto';

  if (r0 === 'width') width = t0;
  else if (r0 === 'count') count = t0;

  if (r1 === 'width') width = t1;
  else if (r1 === 'count') count = t1;

  if (r0 === 'substitution' && r1 === 'substitution') {
    return { width: t0, count: t1 };
  }
  if (r0 === 'substitution') {
    return width === 'auto' ? { width: t0, count } : { width, count: t0 };
  }
  if (r1 === 'substitution') {
    return width === 'auto' ? { width: t1, count } : { width, count: t1 };
  }

  return { width, count };
}

/**
 * Independently parses a `columns` shorthand value into width and count slots.
 * @param {string} value
 * @return {{ width?: string, count?: string } | null}
 */
export function parseShorthand(value) {
  const tokens = tokenizeValue(value);
  if (tokens.length === 0 || tokens.length > 2 || tokens.includes('/')) {
    return null;
  }
  return tokens.length === 1
    ? parseSingleTokenShorthand(tokens[0])
    : parseTwoTokenShorthand(tokens[0], tokens[1]);
}

/**
 * @param {string} prop
 * @param {string} value
 * @return {{ width?: string, count?: string } | null}
 */
export function parseDeclaration(prop, value) {
  if (prop === 'columns') return parseShorthand(value);
  const tokens = tokenizeValue(value);
  if (tokens.length !== 1) return null;
  const role = classifyToken(tokens[0]);
  if (
    prop === 'column-width' &&
    (role === 'width' ||
      role === 'auto' ||
      role === 'css-wide' ||
      role === 'substitution')
  ) {
    return { width: tokens[0] };
  }
  if (
    prop === 'column-count' &&
    (role === 'count' ||
      role === 'auto' ||
      role === 'css-wide' ||
      role === 'substitution')
  ) {
    return { count: tokens[0] };
  }
  return null;
}

/**
 * Computes the cascade state for a rule in a given support environment.
 * @param {import('postcss').Rule | string} cssOrRule
 * @param {{ env?: boolean, var?: boolean, calc?: boolean }} env
 * @return {{ width: string, count: string }}
 */
export function evaluateColumns(cssOrRule, env) {
  const root =
    typeof cssOrRule === 'string' ? postcss.parse(cssOrRule) : cssOrRule;
  const rule =
    root.type === 'rule'
      ? /** @type {import('postcss').Rule} */ (root)
      : /** @type {import('postcss').Rule} */ (root.first);

  const normal = { width: 'auto', count: 'auto' };
  const important = {
    width: /** @type {string | null} */ (null),
    count: /** @type {string | null} */ (null),
  };

  for (const node of rule.nodes) {
    if (node.type !== 'decl') continue;
    const prop = node.prop.toLowerCase();
    if (prop === 'all') {
      const value = node.value.trim().toLowerCase();
      if (value === 'initial' || value === 'unset') {
        const target = node.important ? important : normal;
        target.width = 'auto';
        target.count = 'auto';
      }
      continue;
    }
    if (
      prop !== 'columns' &&
      prop !== 'column-width' &&
      prop !== 'column-count'
    ) {
      continue;
    }

    if (!isSupported(node.value, env)) continue;

    const parsed = parseDeclaration(prop, node.value);
    if (!parsed) continue;

    const target = node.important ? important : normal;
    if (parsed.width !== undefined) {
      target.width = parsed.width.toLowerCase();
    }
    if (parsed.count !== undefined) {
      target.count = parsed.count.toLowerCase();
    }
  }

  return {
    width: important.width ?? normal.width,
    count: important.count ?? normal.count,
  };
}

export const environments = [
  { name: 'full-support', env: { env: true, var: true, calc: true } },
  { name: 'no-env-no-var', env: { env: false, var: false, calc: true } },
  { name: 'env-only', env: { env: true, var: false, calc: true } },
  { name: 'var-only', env: { env: false, var: true, calc: true } },
];

/**
 * Asserts that the computed cascade state of a rule is preserved across all
 * support environments after reduction.
 * @param {string} css
 */
export function assertCascadePreserved(css) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);
  reduceColumns(rule);
  const outCss = root.toString();

  for (const { name, env } of environments) {
    const inState = evaluateColumns(css, env);
    const outState = evaluateColumns(outCss, env);
    assert.deepStrictEqual(
      outState,
      inState,
      `Cascade mismatch in environment "${name}":\n  input:    ${css}\n  reduced:  ${outCss}\n  expected: ${JSON.stringify(inState)}\n  actual:   ${JSON.stringify(outState)}`
    );
  }
}
