import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadCaseModule } from '../cases/modules.js';

function withModule(t, source) {
  const dir = mkdtempSync(join(tmpdir(), 'cssnano-case-module-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'cases.js');
  writeFileSync(file, source);
  return file;
}

test('a case module is read as its one exported object of cases', async (t) => {
  const file = withModule(t, "export const cases = { a: { css: 'a{}' } };");
  assert.deepEqual(await loadCaseModule(file), { a: { css: 'a{}' } });
});

// Merged, a string export would add a case per character.
test('a case module with a second, string export is rejected', async (t) => {
  const file = withModule(
    t,
    "export const cases = {}; export const PREFIX = 'ab';"
  );
  await assert.rejects(loadCaseModule(file), /exactly one plain object/v);
});

test('a case module that exports a string alone is rejected', async (t) => {
  const file = withModule(t, "export const PREFIX = 'ab';");
  await assert.rejects(loadCaseModule(file), /exactly one plain object/v);
});
