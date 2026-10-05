import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';

/** @param {string} css */
function merge(css) {
  return postcss([plugin]).process(css, { from: undefined }).css;
}

test('should merge overlapping declarations of three adjacent rules into two rules', () => {
  assert.equal(
    merge('.a{color:red}.b{color:red;font-weight:bold}.c{font-weight:bold}'),
    '.a,.b{color:red}.b,.c{font-weight:bold}'
  );
});

test('should move a rule into the earlier equal block and merge it there', () => {
  // Moving a rule into the earlier equal block changes which rules share a
  // parent, so the stylesheet must be rescanned afterwards.
  assert.equal(
    merge('@media print{.a{color:red}}@media print{.b{color:red}}'),
    '@media print{.a,.b{color:red}}'
  );
});

test('should merge the earlier pair first when two adjacent pairs share equally many declarations', () => {
  // Ties go to the earlier pair, as the previous priority queue did by
  // source position; `.b` keeps the declaration the second merge needs.
  assert.equal(
    postcss([plugin]).process(
      '.a{color:red}.b{color:red;margin:0}.c{margin:0}',
      {
        from: undefined,
      }
    ).css,
    '.a,.b{color:red}.b,.c{margin:0}'
  );
});

test('should merge the pair sharing the most declarations before a pair that shares fewer', () => {
  // `.b` and `.c` share two declarations, `.a` and `.b` only one. Merging the
  // first pair first would split `.b` across two rules and repeat its selector.
  assert.equal(
    merge(
      '.a{color:red}.b{color:red;margin:0;padding:0}.c{margin:0;padding:0}'
    ),
    '.a,.b{color:red}.b,.c{margin:0;padding:0}'
  );
});

test('should merge the best pair of a chain whose shared declarations keep increasing across several rules', () => {
  // Minimal case from turret: an empty rule leads a chain where the second
  // pair shares one declaration and the third shares two.
  assert.equal(
    postcss([plugin]).process(
      "input[type='range']::-moz-range-track{}input[type='range']::-ms-thumb{-webkit-transition:all 200ms ease-in-out}input[type='range']::-ms-fill-upper{-webkit-transition:all 200ms ease-in-out;transition:all 200ms ease-in-out}input[type='range']::-ms-track{-webkit-transition:all 200ms ease-in-out;transition:all 200ms ease-in-out}",
      { from: undefined }
    ).css,
    "input[type='range']::-moz-range-track{}input[type='range']::-ms-thumb{-webkit-transition:all 200ms ease-in-out}input[type='range']::-ms-fill-upper,input[type='range']::-ms-track{-webkit-transition:all 200ms ease-in-out;transition:all 200ms ease-in-out}"
  );
});

test('should merge the best pair of a chain whose shared declarations include !important values', () => {
  // Minimal case from semantic-ui: the pair sharing three declarations wins
  // over the pair sharing two, and the leftover `overflow-x` stays separate.
  assert.equal(
    postcss([plugin]).process(
      '.ui.scrolling.dropdown .menu,.ui.dropdown .scrolling.menu{overflow-x:hidden;overflow-y:auto}.ui.scrolling.dropdown .menu{overflow-x:hidden;overflow-y:auto;min-width:100%!important;width:auto!important}.ui.dropdown .scrolling.menu{overflow-y:auto;min-width:100%!important;width:auto!important}',
      { from: undefined }
    ).css,
    '.ui.scrolling.dropdown .menu,.ui.dropdown .scrolling.menu{overflow-x:hidden;overflow-y:auto;min-width:100%!important;width:auto!important}.ui.scrolling.dropdown .menu{overflow-x:hidden}'
  );
});

test('should still merge a lower-benefit pair when the higher-benefit pair next to it cannot merge', () => {
  // `.b` and `.c::-moz-selection` share two declarations, but a vendor-
  // prefixed selector cannot join an unprefixed one. The scan must fall back
  // to the pair it passed over instead of leaving `.a` and `.b` apart.
  assert.equal(
    merge(
      '.a{color:red}.b{color:red;margin:0;padding:0}.c::-moz-selection{margin:0;padding:0}'
    ),
    '.a,.b{color:red}.b{margin:0;padding:0}.c::-moz-selection{margin:0;padding:0}'
  );
});

test('should converge on a bounded deterministic rewrite corpus', () => {
  const inputs = Array.from({ length: 12 }, (_, index) => {
    const suffix = String(index);
    return [
      `.a${suffix}{color:red;color:red;font-weight:bold}`,
      `.b${suffix}{color:red;display:grid;gap:1rem}`,
      `.c${suffix}{/*!keep-${suffix}*/color:red;display:grid}`,
      `@media x{.d${suffix}{font-weight:bold;margin:0}}`,
      `@media x{.e${suffix}{font-weight:bold;padding:0}}`,
    ].join('');
  });

  for (const input of inputs) {
    const first = postcss([plugin]).process(input, { from: undefined }).css;
    const second = postcss([plugin]).process(first, {
      from: undefined,
    }).css;
    assert.equal(second, first);
    assert.ok(first.length <= input.length);
    assert.equal(
      (first.match(/\/\*!/gv) ?? []).length,
      (input.match(/\/\*!/gv) ?? []).length
    );
  }
});

const pluginUrl = new URL('../src/index.js', import.meta.url).href;

/**
 * Runs the plugin on every input in one child process under a time and heap
 * limit. The scan loop is synchronous, so a `node:test` timeout cannot
 * interrupt a runaway merge and an out-of-memory crash would take down the
 * whole test runner. The child prints each input's index before processing it,
 * so a hang or crash is attributed to the last input started.
 *
 * @param {string[]} inputs
 * @return {{css: string[], terminated: boolean, stuckOn: string | undefined}}
 */
function processAllWithLimits(inputs) {
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const inputs = ${JSON.stringify(inputs)};
    inputs.forEach((css, index) => {
      process.stdout.write(index + '\\n');
      process.stdout.write(JSON.stringify(postcss([plugin]).process(css, {from: undefined}).css) + '\\n');
    });
  `;
  const result = spawnSync(
    process.execPath,
    ['--max-old-space-size=256', '--input-type=module', '-e', script],
    { timeout: 30_000, encoding: 'utf8', cwd: new URL('..', import.meta.url) }
  );
  const lines = (result.stdout ?? '').split('\n').filter(Boolean);
  const css = lines
    .filter((_, index) => index % 2 === 1)
    .map((line) => JSON.parse(line));
  const terminated = result.status !== 0;
  return {
    css,
    terminated,
    stuckOn: terminated ? inputs[css.length] : undefined,
  };
}

/** @param {string} css */
function processWithLimits(css) {
  const { css: outputs, terminated } = processAllWithLimits([css]);
  return { css: outputs[0], terminated };
}

const crossParentMoveThenAnotherMove = [
  [
    'an @layer statement',
    '@media print{.c{top:0;color:red}}@layer x;@media print{.a{color:red}.b{}}',
  ],
  [
    'an @font-face rule',
    '@media print{.c{top:0;color:red}}@font-face{font-family:x}@media print{.a{color:red}.b{}}',
  ],
  [
    'two @page rules',
    '@media print{.c{top:0;color:red}}@page{margin:0}@page :first{margin:1px}@media print{.a{color:red}.b{}}',
  ],
];

for (const [separator, css] of crossParentMoveThenAnotherMove) {
  test(`should terminate on a merge after a cross-parent move followed by another move into the same block, separated by ${separator}`, () => {
    const result = processWithLimits(css);
    assert.equal(result.terminated, false);
  });
}

test('should merge the shared declaration after a cross-parent move followed by another move into the same block', () => {
  assert.equal(
    processWithLimits(crossParentMoveThenAnotherMove[0][1]).css,
    '@media print{.c{top:0}.c,.a{color:red}.b{}}@layer x'
  );
});

/** Park–Miller generator; the products stay below Number.MAX_SAFE_INTEGER. @param {number} seed */
function randomSource(seed) {
  let state = seed % 2_147_483_647 || 1;
  return () => {
    state = (state * 48_271) % 2_147_483_647;
    return state / 2_147_483_647;
  };
}

/** Generates equal @media blocks split by non-rule at-rules, sharing a declaration. */
function generateSplitMediaCase(random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const separators = [
    '',
    '@layer x;',
    '@font-face{font-family:x}',
    '@page{margin:0}',
  ];
  const rules = [
    () => '.c{top:0;color:red}',
    () => '.a{color:red}',
    () => '.b{}',
    () => '.d{color:red;left:0}',
    () => '.e{top:0}',
  ];
  // Equal conditional blocks are the only ones the plugin joins, so each
  // case repeats one wrapper.
  const wrapper = pick(['@media print', '@supports (color:red)']);
  const blocks = 2 + Math.floor(random() * 3);
  let css = '';
  for (let block = 0; block < blocks; block++) {
    const body = Array.from({ length: 1 + Math.floor(random() * 3) }, () =>
      pick(rules)()
    ).join('');
    css += `${wrapper}{${body}}${pick(separators)}`;
  }
  return css;
}

test('should terminate on generated equal @media blocks separated by non-rule at-rules', () => {
  const random = randomSource(0x5eed);
  const inputs = Array.from({ length: 12 }, () =>
    generateSplitMediaCase(random)
  );
  assert.equal(processAllWithLimits(inputs).stuckOn, undefined);
});

test('should leave a statement at-rule between nested rules in place', () => {
  assert.equal(
    processAllWithLimits(['.r{@layer x;.a{top:0}.b{top:0}}']).stuckOn,
    undefined
  );
});

test('should process an empty stylesheet', () => {
  assert.equal(processAllWithLimits(['']).stuckOn, undefined);
});

test('should share declarations a rule gained from a same-selector merge with a later rule', () => {
  // Merging `.a` with `.a` grows the first rule; its declarations must be
  // compared afresh, not from before the merge, when it meets `.b`.
  assert.equal(
    merge('.a{color:red}.a{margin:0}.b{margin:0}'),
    '.a{color:red}.a,.b{margin:0}'
  );
});
