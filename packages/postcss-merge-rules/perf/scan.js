import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const pluginUrl = new URL('../src/index.js', import.meta.url).href;

test('should merge many equivalent @media blocks nested in one style rule without quadratic slowdown', () => {
  // Each candidate pair has different parents, so the check for a declaration
  // of the enclosing rule between them must not rescan the rule from its start.
  // The stylesheet is built in the child process: it is too large for argv.
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const blocks = Array.from({ length: 16000 }, (_, index) =>
      '@media (a){.x' + index + '{color:red;margin:' + index + 'px}}'
    ).join('');
    postcss([plugin]).process('.p{' + blocks + '}', { from: undefined }).css;
  `;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { timeout: 20_000, cwd: new URL('..', import.meta.url) }
  );
  assert.equal(result.status, 0);
});

test('should merge many equivalent @media blocks nested in one style rule when the enclosing rule declares a property without quadratic slowdown', () => {
  // Each candidate pair has different parents, so the check for a declaration
  // of the enclosing rule between them must not rescan the rule from its start.
  // The stylesheet is built in the child process: it is too large for argv.
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const blocks = Array.from({ length: 16000 }, (_, index) =>
      '@media (a){.x' + index + '{color:red;margin:' + index + 'px}}'
    ).join('');
    postcss([plugin]).process('.p{color:blue;' + blocks + '}', { from: undefined }).css;
  `;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { timeout: 20_000, cwd: new URL('..', import.meta.url) }
  );
  assert.equal(result.status, 0);
});

test('should merge many equal rules nested in a style rule that declares a property without quadratic slowdown', () => {
  // A declaration of the enclosing rule makes each pair check for a separating
  // declaration, so slots emptied by earlier merges must be crossed once.
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const rules = '.a{top:0}'.repeat(64000);
    postcss([plugin]).process('.r{color:red;' + rules + '}', { from: undefined }).css;
  `;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { timeout: 20_000, cwd: new URL('..', import.meta.url) }
  );
  assert.equal(result.status, 0);
});

test('should remove many emptied @media blocks of one parent without quadratic slowdown', () => {
  // Removing each emptied block from its parent one at a time searches the
  // child list every time; the write rebuilds the parent once instead.
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const blocks = '@media print{.a{top:0}}'.repeat(160000);
    postcss([plugin]).process(blocks, { from: undefined }).css;
  `;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    // The quadratic version takes about 25 s; the margin keeps a loaded
    // machine from failing the test.
    { timeout: 15_000, cwd: new URL('..', import.meta.url) }
  );
  assert.equal(result.status, 0);
});

test('should merge many equal @media blocks each separated by a declaration of the enclosing rule without quadratic slowdown', () => {
  // Climbing out of each block must not search the children of the enclosing
  // rule for the block's position.
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const blocks = '@media print{.a{top:0}}color:red;'.repeat(256000);
    postcss([plugin]).process('.r{' + blocks + '}', { from: undefined }).css;
  `;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { timeout: 12_000, cwd: new URL('..', import.meta.url) }
  );
  assert.equal(result.status, 0);
});
