import { test } from 'node:test';
import assert from 'node:assert';
import { enabledPlugins } from '../src/utils/enabledPlugins.js';

const plugin = () => ({ postcssPlugin: 'fake-plugin' });

/** @param {unknown} options */
function presetWithOptions(options) {
  return () => ({ plugins: [[plugin, options]] });
}

test('enabled plugins run when their options are undefined', () => {
  assert.deepStrictEqual(enabledPlugins(presetWithOptions(undefined)), [
    [plugin, undefined],
  ]);
});

test('enabled plugins run when their options are true', () => {
  assert.deepStrictEqual(enabledPlugins(presetWithOptions(true)), [
    [plugin, true],
  ]);
});

test('enabled plugins are skipped when their options are false', () => {
  assert.deepStrictEqual(enabledPlugins(presetWithOptions(false)), []);
});

test('enabled plugins are skipped when their options are null, where cssnano would throw', () => {
  assert.deepStrictEqual(enabledPlugins(presetWithOptions(null)), []);
});

test('enabled plugins are skipped when their options set exclude', () => {
  assert.deepStrictEqual(
    enabledPlugins(presetWithOptions({ exclude: true })),
    []
  );
});

test('enabled plugins run when their options are an object without exclude', () => {
  const options = { preset: 'simple' };
  assert.deepStrictEqual(enabledPlugins(presetWithOptions(options)), [
    [plugin, options],
  ]);
});
