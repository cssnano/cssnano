import assert from 'node:assert/strict';
import { test, suite } from 'node:test';
import postcss from 'postcss';
import { reduceColumns } from '../src/lib/decl/columns.js';
import { random } from '../../../util/fuzzRng.js';

/**
 * Independent computed-state cascade oracle for column-width and column-count.
 * Deliberately models the CSS cascade rules, importance lanes, and support
 * environments without depending on cssnano internals or regex shorthand matching.
 */

const CSS_WIDE = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
]);
const COUNT_RE = /^\+?[1-9]\d*$/;
const LENGTH_RE =
  /^\+?(?:\d*\.\d+|\d+)(px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q)$/i;

/**
 * Splits CSS declaration values respecting nested function boundaries.
 * @param {string} value
 * @return {string[]}
 */
function tokenizeValue(value) {
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
function isSupported(token, env) {
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
function classifyToken(token) {
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
 * Independently parses a `columns` shorthand value into width and count slots.
/**
 * @param {string} t
 * @return {{ width?: string, count?: string } | null}
 */
function parseSingleTokenShorthand(t) {
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
 * @param {string} t0
 * @param {string} t1
 * @return {{ width?: string, count?: string } | null}
 */
function parseTwoTokenShorthand(t0, t1) {
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
function parseShorthand(value) {
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
function parseDeclaration(prop, value) {
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
function evaluateColumns(cssOrRule, env) {
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

const environments = [
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
function assertCascadePreserved(css) {
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

suite(
  'computed-state oracle: structured interleavings and importance lanes',
  () => {
    test('preserves computed state across width-first and count-first longhand pairs', () => {
      assertCascadePreserved('h1{column-width:10px;column-count:2}');
      assertCascadePreserved('h1{column-count:2;column-width:10px}');
    });

    test('preserves computed state when shorthand overrides earlier longhands', () => {
      assertCascadePreserved('h1{column-width:10px;columns:20px 3}');
      assertCascadePreserved('h1{column-count:2;columns:20px 3}');
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;columns:20px 3}'
      );
    });

    test('preserves computed state when later longhands override earlier shorthand components', () => {
      assertCascadePreserved('h1{columns:10px 2;column-width:20px}');
      assertCascadePreserved('h1{columns:10px 2;column-count:4}');
      assertCascadePreserved(
        'h1{columns:10px 2;column-width:20px;column-count:4}'
      );
    });

    test('preserves computed state when shorthand overrides earlier shorthand', () => {
      assertCascadePreserved('h1{columns:10px 2;columns:30px 5}');
    });

    test('preserves computed state across shorthand normalization dropping initial auto', () => {
      assertCascadePreserved('h1{columns:auto 2}');
      assertCascadePreserved('h1{columns:10px auto}');
      assertCascadePreserved('h1{columns:auto auto}');
    });

    test('preserves computed state for separate importance lanes without cross-merging', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2 !important;column-width:20px !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;column-width:20px !important;column-count:4 !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;column-count:4 !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px !important;column-count:4 !important}'
      );
    });
  }
);

suite('computed-state oracle: CSS-wide keywords', () => {
  test('merges identical CSS-wide keyword pairs into single shorthand keyword', () => {
    assertCascadePreserved('h1{column-width:inherit;column-count:inherit}');
    assertCascadePreserved('h1{column-width:initial;column-count:initial}');
    assertCascadePreserved('h1{column-width:unset;column-count:unset}');
    assertCascadePreserved('h1{column-width:revert;column-count:revert}');
    assertCascadePreserved(
      'h1{column-width:revert-layer;column-count:revert-layer}'
    );
  });

  test('refuses merge when components use different CSS-wide keywords', () => {
    assertCascadePreserved('h1{column-width:inherit;column-count:unset}');
    assertCascadePreserved('h1{column-width:revert;column-count:revert-layer}');
    assertCascadePreserved('h1{column-width:initial;column-count:revert}');
  });

  test('refuses merge when only one component is a CSS-wide keyword', () => {
    assertCascadePreserved('h1{column-width:inherit;column-count:3}');
    assertCascadePreserved('h1{column-width:10px;column-count:unset}');
    assertCascadePreserved('h1{column-width:revert;column-count:4}');
    assertCascadePreserved('h1{column-width:20px;column-count:revert-layer}');
  });

  test('preserves computed state when shorthand with CSS-wide keyword overrides longhands', () => {
    assertCascadePreserved(
      'h1{column-width:10px;column-count:2;columns:revert}'
    );
    assertCascadePreserved('h1{columns:unset;column-width:20px}');
    assertCascadePreserved('h1{columns:revert-layer;column-count:3}');
  });
});

suite('computed-state oracle: support-dependent values and fallbacks', () => {
  test('preserves fallback when one longhand introduces unsupported env()', () => {
    assertCascadePreserved(
      'h1{column-width:12em;column-width:env(col-w);column-count:3}'
    );
  });

  test('preserves fallback when longhand introduces unsupported var()', () => {
    assertCascadePreserved(
      'h1{column-width:12em;column-width:var(--w);column-count:3}'
    );
  });

  test('merges when both components share identical env() support requirements', () => {
    assertCascadePreserved(
      'h1{column-width:env(col-w);column-count:env(col-c)}'
    );
  });

  test('preserves calc fallback while companion count is present', () => {
    assertCascadePreserved(
      'h1{column-width:10px;column-width:calc(5px + 5px);column-count:2}'
    );
  });

  test('refuses invalid declarations without disturbing valid companions', () => {
    assertCascadePreserved('h1{column-width:10px;column-count:0}');
    assertCascadePreserved('h1{column-width:-10px;column-count:2}');
    assertCascadePreserved('h1{column-width:12em;column-count:2.5}');
  });
});

suite(
  'retention-heavy cases: duplicate cleanup and fallback preservation',
  () => {
    test('cleans up redundant duplicate longhands without fallbacks', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;column-width:30px;column-count:2}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:10px;column-count:2;column-count:2}'
      );
      assertCascadePreserved(
        'h1{column-count:1;column-count:2;column-count:3;column-width:15px}'
      );
    });

    test('preserves multi-step fallback ladders while merging companions', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:calc(5px + 5px);column-width:env(col-w);column-count:3}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:env(col-w);column-count:2;column-count:env(col-c)}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;column-width:var(--w);column-count:var(--c)}'
      );
    });

    test('handles retention and cleanup in mixed importance lanes', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;column-count:2;column-width:30px !important;column-width:40px !important;column-count:4 !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:env(col-w);column-width:20px !important;column-width:env(col-w2) !important}'
      );
    });

    test('cleans up earlier longhands superseded by overriding shorthand', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;column-count:2;columns:40px 4}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;columns:40px 4;column-width:50px}'
      );
    });
  }
);

/**
 * Deterministic generator for random column declaration rules.
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function generateRandomRule(rng) {
  const widths = ['10px', '12em', '15rem', '20vw', 'calc(5px + 5px)', 'auto'];
  const counts = ['1', '2', '3', '4', 'auto'];
  const cssWide = ['inherit', 'initial', 'unset', 'revert', 'revert-layer'];
  const supportWidths = ['env(col-w)', 'var(--w)'];
  const supportCounts = ['env(col-c)', 'var(--c)'];
  const allWidths = [...widths, ...supportWidths, ...cssWide];
  const allCounts = [...counts, ...supportCounts, ...cssWide];

  const declCount = rng.int(6) + 2; // 2 to 7 declarations
  const decls = [];

  for (let i = 0; i < declCount; i++) {
    const important = rng.chance(0.3) ? ' !important' : '';
    const kind = rng.int(3);

    if (kind === 0) {
      const val = rng.pick(allWidths);
      decls.push(`column-width:${val}${important}`);
    } else if (kind === 1) {
      const val = rng.pick(allCounts);
      decls.push(`column-count:${val}${important}`);
    } else {
      const subKind = rng.int(6);
      let val;
      if (subKind === 0) {
        val = rng.pick(cssWide);
      } else if (subKind === 1) {
        val = `${rng.pick([...widths, ...supportWidths])} ${rng.pick([...counts, ...supportCounts])}`;
      } else if (subKind === 2) {
        val = `${rng.pick([...counts, ...supportCounts])} ${rng.pick([...widths, ...supportWidths])}`;
      } else if (subKind === 3) {
        val = rng.pick([...widths, ...supportWidths]);
      } else if (subKind === 4) {
        val = rng.pick([...counts, ...supportCounts]);
      } else {
        val = rng.pick(['auto', 'auto auto', '10px auto', 'auto 3']);
      }
      decls.push(`columns:${val}${important}`);
    }
  }

  return `h1{${decls.join(';')}}`;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function generateResetRule(rng) {
  const allImportant = rng.chance(0.5);
  const matching = rng.chance(0.5);
  const declarationImportant = matching ? allImportant : !allImportant;
  const important = declarationImportant ? ' !important' : '';
  const resetImportant = allImportant ? ' !important' : '';
  const prop = rng.chance(0.2) ? 'ALL' : 'all';
  const value = rng.chance(0.5) ? 'initial' : 'unset';
  return `h1{column-width:10px${important};${prop}:${value}${resetImportant};column-count:2${important}}`;
}

/**
 * Deterministic generator for retention-heavy rules.
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function generateRetentionHeavyRule(rng) {
  const decls = [];
  const important = rng.chance(0.4);
  const impStr = important ? ' !important' : '';

  const pattern = rng.int(4);
  if (pattern === 0) {
    // Duplicate width cleanup + companion count
    decls.push(`column-width:10px${impStr}`);
    decls.push(`column-width:20px${impStr}`);
    if (rng.chance(0.5)) decls.push(`column-width:20px${impStr}`);
    decls.push(`column-width:30px${impStr}`);
    decls.push(`column-count:${rng.int(4) + 1}${impStr}`);
  } else if (pattern === 1) {
    // Fallback preservation: plain value then env/var
    decls.push(`column-width:10px${impStr}`);
    decls.push(`column-width:env(col-w)${impStr}`);
    decls.push(`column-count:2${impStr}`);
    if (rng.chance(0.5)) decls.push(`column-count:env(col-c)${impStr}`);
  } else if (pattern === 2) {
    // Overriding shorthand after longhands with fallback
    decls.push('column-width:10px');
    decls.push('column-width:20px');
    decls.push('column-count:2');
    decls.push('columns:40px 4');
    if (rng.chance(0.5)) decls.push('column-width:50px');
  } else {
    // Mixed importance lanes with duplicates
    decls.push('column-width:10px');
    decls.push('column-width:20px');
    decls.push('column-count:2');
    decls.push('column-width:30px !important');
    decls.push('column-width:40px !important');
    decls.push('column-count:4 !important');
  }

  return `h1{${decls.join(';')}}`;
}

suite('randomized seeded differential cascade sweep', () => {
  const casesPerSeed = 250;
  for (const seed of [1, 2, 3, 4]) {
    test(`preserves computed cascade state across environments, seed ${seed}`, () => {
      const rng = random(seed);
      let importantCount = 0;
      let mixedLaneCount = 0;
      let fallbackCount = 0;
      let cssWideCount = 0;
      let reducedCount = 0;
      let matchingResetCount = 0;
      let oppositeResetCount = 0;
      let normalResetCount = 0;
      let importantResetCount = 0;

      for (let i = 0; i < casesPerSeed; i++) {
        let css;
        if (i < 50) css = generateRetentionHeavyRule(rng);
        else if (i < 100) css = generateResetRule(rng);
        else css = generateRandomRule(rng);

        const hasImportant = css.includes('!important');
        const hasNormal =
          css.includes(';') && /(?:^|;)[^;]*:(?:(?!important).)*$/.test(css);
        if (hasImportant) importantCount++;
        if (hasImportant && hasNormal) mixedLaneCount++;
        if (css.includes('env(') || css.includes('var(')) fallbackCount++;
        if (
          css.includes('revert') ||
          css.includes('unset') ||
          css.includes('inherit') ||
          css.includes('initial')
        ) {
          cssWideCount++;
        }
        const reset = /(?:^|;)all:(?:initial|unset)( !important)?;/i.exec(css);
        if (reset) {
          const resetImportant = Boolean(reset[1]);
          if (resetImportant) importantResetCount++;
          else normalResetCount++;
          const declarationImportant = css
            .slice(0, css.toLowerCase().indexOf('all:'))
            .includes('!important');
          if (declarationImportant === resetImportant) matchingResetCount++;
          else oppositeResetCount++;
        }

        const root = postcss.parse(css);
        const rule = /** @type {import('postcss').Rule} */ (root.first);
        reduceColumns(rule);
        const outCss = root.toString();
        if (outCss !== css) reducedCount++;

        for (const { name, env } of environments) {
          const inState = evaluateColumns(css, env);
          const outState = evaluateColumns(outCss, env);
          assert.deepStrictEqual(
            outState,
            inState,
            `Seed ${seed}, case ${i} mismatch in env "${name}":\n  in:  ${css}\n  out: ${outCss}`
          );
        }
      }

      assert(
        importantCount >= 60,
        `seed ${seed} must exercise at least 60 !important declarations`
      );
      assert(
        fallbackCount >= 50,
        `seed ${seed} must exercise at least 50 fallback/substitution rules`
      );
      assert(
        cssWideCount >= 60,
        `seed ${seed} must exercise at least 60 CSS-wide keyword rules`
      );
      assert(
        matchingResetCount >= 10,
        `seed ${seed} should exercise matching-lane all resets`
      );
      assert(
        oppositeResetCount >= 10,
        `seed ${seed} should exercise opposite-lane all resets`
      );
      assert(
        normalResetCount >= 10 && importantResetCount >= 10,
        `seed ${seed} should exercise all resets in both importance lanes`
      );
      assert(reducedCount >= 80, `seed ${seed} must reduce at least 80 rules`);
    });
  }
});
