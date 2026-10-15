import { test } from 'node:test';
import assert from 'node:assert';
import cssnano from 'cssnano';
import presets from '../src/_data/presets.js';

test('preset registry names resolve to presets cssnano ships', () => {
  for (const preset of presets) {
    assert.doesNotThrow(() => cssnano({ preset: preset.packageName }));
  }
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
