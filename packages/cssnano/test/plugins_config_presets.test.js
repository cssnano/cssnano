import assert from 'node:assert/strict';
import { test } from 'node:test';
import autoprefixer from 'autoprefixer';
import litePreset from 'cssnano-preset-lite';
import postcss from 'postcss';
import cssnano from '../src/index.js';

test('should run the plugins in the preset', async () => {
  const preset = litePreset();

  const result = await postcss([cssnano({ preset })]).process(
    `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{display:grid;transition:all .5s;user-select:none;background:linear-gradient(to bottom,white,black)}`
  );
});

test('should run the plugins in the first preset in an array', async () => {
  const preset = litePreset();

  const result = await postcss([cssnano({ preset: [preset] })]).process(
    `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{display:grid;transition:all .5s;user-select:none;background:linear-gradient(to bottom,white,black)}`
  );
});

test('should run the plugin passed through the cssnano config.plugins', async () => {
  const preset = litePreset({ discardComments: false });

  const result = await postcss([
    cssnano({ preset, plugins: [autoprefixer] }),
  ]).process(
    `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{display:grid;transition:all .5s;-ms-user-select:none;user-select:none;background:linear-gradient(to bottom,white,black)}`
  );
});

test('should retain the plugins-only result with a string preset', async () => {
  const result = await postcss([
    cssnano({ preset: 'lite', plugins: [autoprefixer] }),
  ]).process(`.example { user-select: none; }`, { from: undefined });

  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should retain the plugins-only result with a preset factory', async () => {
  const result = await postcss([
    cssnano({ preset: litePreset, plugins: [autoprefixer] }),
  ]).process(`.example { user-select: none; }`, { from: undefined });

  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should retain the plugins-only result with a configured preset', async () => {
  const result = await postcss([
    cssnano({ preset: [litePreset, {}], plugins: [autoprefixer] }),
  ]).process(`.example { user-select: none; }`, { from: undefined });

  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should run the plugin when plugin module is being used with no array inside plugins', async () => {
  const preset = litePreset();
  const result = await postcss([
    cssnano({ preset, plugins: [autoprefixer] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should run the plugin when no preset is mentioned', async () => {
  const result = await postcss([cssnano({ plugins: [autoprefixer] })]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example { -ms-user-select: none; user-select: none; }
`
  );
});

test('should run the plugin when no preset is mentioned with string plugin name', async () => {
  const result = await postcss([
    cssnano({ plugins: ['autoprefixer'] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example { -ms-user-select: none; user-select: none; }
`
  );
});

test('should run the plugin when no preset is mentioned with string plugin name as in array', async () => {
  const result = await postcss([
    cssnano({ plugins: [['autoprefixer']] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example { -ms-user-select: none; user-select: none; }
`
  );
});

test('should run the plugin with string plugin name as in array', async () => {
  const preset = litePreset();
  const result = await postcss([
    cssnano({ preset, plugins: [['autoprefixer']] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should run the plugin when no preset is mentioned with string plugin name as in array and options', async () => {
  const result = await postcss([
    cssnano({ plugins: [['autoprefixer', { remove: false }]] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example { -ms-user-select: none; user-select: none; }
`
  );
});

test('should run the plugin with string plugin name as in array and options', async () => {
  const preset = litePreset();
  const result = await postcss([
    cssnano({ preset, plugins: [['autoprefixer', { remove: false }]] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});
