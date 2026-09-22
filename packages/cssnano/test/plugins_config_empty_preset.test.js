import assert from 'node:assert/strict';
import { test } from 'node:test';
import autoprefixer from 'autoprefixer';
import litePreset from 'cssnano-preset-lite';
import postcss from 'postcss';
import cssnano from '../src/index.js';

test('should run the plugin when preset is empty array and plugin module as in array in plugins array', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: [[autoprefixer]] }),
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

test('should run the plugin plugin module as in array in plugins array', async () => {
  const preset = litePreset();
  const result = await postcss(
    cssnano({ preset, plugins: [[autoprefixer]] })
  ).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should run the plugin plugin module as in array in plugins array with empty plugin option', async () => {
  const preset = litePreset();
  const result = await postcss([
    cssnano({ preset, plugins: [[autoprefixer, {}]] }),
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

test('should run the plugin when preset is empty array and plugin module as in non array in plugins array', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: [autoprefixer] }),
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

test('should run the plugin when preset is empty array and plugin as string as in non array in plugins array', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: ['autoprefixer'] }),
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

test('should run the plugin when preset is empty array', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: [[autoprefixer, { grid: 'autoplace' }]] }),
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

test('should run the plugin when preset is empty array with string as a plugin', async () => {
  const result = await postcss([
    cssnano({
      preset: [],
      plugins: [['autoprefixer', { grid: 'autoplace' }]],
    }),
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

test('should run the plugin when preset is empty array with options', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: [[autoprefixer, { add: false }]] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined }
  );
  assert.strictEqual(
    result.css,
    `.example { user-select: none; }
`
  );
});

test('should run the plugin when preset is empty array with options and string as plugin', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: [['autoprefixer', { add: false }]] }),
  ]).process(
    `.example { user-select: none; }
`,
    { from: undefined },
    { preset: [], plugins: [['autoprefixer', { add: false }]] }
  );
  assert.strictEqual(
    result.css,
    `.example { user-select: none; }
`
  );
});

test('should run the plugin when preset is empty array with options and string as plugin and no options for the plugin', async () => {
  const result = await postcss([
    cssnano({ preset: [], plugins: [['autoprefixer']] }),
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
