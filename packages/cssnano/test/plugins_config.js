import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from 'cssnano-preset-lite';
import autoprefixer from 'autoprefixer';
import cssnano from '../src/index.js';

const { test } = nodetest;
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

for (const [description, preset] of [
  ['a string preset', 'lite'],
  ['a preset factory', litePreset],
  ['a configured preset', [litePreset, {}]],
]) {
  test(`should retain the plugins-only result with ${description}`, async () => {
    const result = await postcss([
      cssnano({ preset, plugins: [autoprefixer] }),
    ]).process(`.example { user-select: none; }`, { from: undefined });

    assert.strictEqual(
      result.css,
      `.example { -ms-user-select: none; user-select: none; }`
    );
  });
}

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
    cssnano({ preset: [], plugins: [['autoprefixer', { grid: 'autoplace' }]] }),
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
