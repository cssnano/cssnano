import { test } from 'node:test';
import assert from 'node:assert';
import cssnano from 'cssnano';
import presets from '../src/_data/presets.js';

test('preset registry ids resolve to built-in presets cssnano ships', async () => {
  for (const preset of presets) {
    const { default: builtIn } = await import(`cssnano/presets/${preset.id}`);
    assert.doesNotThrow(() => cssnano({ preset: builtIn }));
  }
});

test('preset registry lists presets in the order shown to users: default, lite, advanced', () => {
  assert.deepStrictEqual(
    presets.map((preset) => preset.id),
    ['default', 'lite', 'advanced']
  );
});
