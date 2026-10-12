import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import presets from '../src/_data/presets.js';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

test('preset registry lists each cssnano preset dependency exactly once', () => {
  const presetDependencies = Object.keys(packageJson.dependencies)
    .filter((name) => name.startsWith('cssnano-preset-'))
    .toSorted();
  const registered = presets.map((preset) => preset.packageName).toSorted();
  assert.deepStrictEqual(registered, presetDependencies);
});

test('preset registry names each package after its id', () => {
  for (const preset of presets) {
    assert.strictEqual(preset.packageName, `cssnano-preset-${preset.id}`);
  }
});

test('preset registry lists presets in the order shown to users: default, lite, advanced', () => {
  assert.deepStrictEqual(
    presets.map((preset) => preset.id),
    ['default', 'lite', 'advanced']
  );
});
