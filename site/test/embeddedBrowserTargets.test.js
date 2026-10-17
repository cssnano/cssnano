import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import * as cssnanoTargets from '../../packages/cssnano/src/utils/browserTargets.js';
import { browserTargets } from '../../packages/cssnano/src/utils/browserTargets.js';

const embedded = ['chrome 140', 'firefox 142'];
globalThis.CSSNANO_PLAYGROUND_TARGETS = embedded;
const stub = await import('../src/utils/embeddedBrowserTargets.js');

test('the embedded targets module provides every name that cssnano imports from the browser targets module', async () => {
  // The presets import the symbol that the plugins read, so every source file counts.
  const sourceDirectory = new URL(
    '../../packages/cssnano/src/',
    import.meta.url
  );
  const imported = new Set();
  for await (const file of glob('**/*.js', { cwd: sourceDirectory })) {
    const source = await readFile(new URL(file, sourceDirectory), 'utf8');
    for (const [, names] of source.matchAll(
      // A JSDoc @import is type-only and erased, so only a value import counts.
      /(?<![\w@])import\s*\{([^\}]*)\}\s*from\s*'#utils\/browser-targets'/gv
    )) {
      for (const name of names.split(',')) {
        if (name.trim()) imported.add(name.trim());
      }
    }
  }
  assert.ok(imported.has('browserTargets'));
  assert.ok(imported.has('resolveTargets'));
  for (const name of imported) {
    assert.ok(Object.hasOwn(stub, name), name);
    assert.ok(name in cssnanoTargets, name);
  }
});

test('the embedded targets module fails loudly when the build-time define is missing', async () => {
  delete globalThis.CSSNANO_PLAYGROUND_TARGETS;
  const bare = await import('../src/utils/embeddedBrowserTargets.js?bare');
  try {
    assert.throws(() => bare.resolveTargets(), /CSSNANO_PLAYGROUND_TARGETS/v);
  } finally {
    globalThis.CSSNANO_PLAYGROUND_TARGETS = embedded;
  }
});

test('the embedded targets are the list resolved when the site builds, whatever the query', () => {
  assert.deepEqual(
    [
      ...stub.resolveTargets(
        { [browserTargets]: { query: 'ie 11' } },
        undefined
      ),
    ],
    embedded
  );
});

test('the embedded targets are frozen like the targets cssnano resolves', () => {
  assert.ok(Object.isFrozen(stub.resolveTargets({}, undefined)));
});
