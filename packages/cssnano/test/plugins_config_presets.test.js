import assert from 'node:assert/strict';
import { test } from 'node:test';
import autoprefixer from 'autoprefixer';
import litePreset from '#presets/lite';
import postcss from 'postcss';
import { testTargets } from '../../../util/testHelpers.js';

test('should run the plugins in the preset', async () => {
  const result = await postcss(
    litePreset({ browserslist: { query: testTargets } })
  ).process(
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

// Other PostCSS plugins are configured in PostCSS, next to cssnano.
test('should run a PostCSS plugin listed after cssnano', async () => {
  const result = await postcss([
    ...litePreset({ browserslist: { query: testTargets } }),
    autoprefixer({ overrideBrowserslist: testTargets }),
  ]).process(`.example { user-select: none; }`, { from: undefined });
  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});

test('should run a PostCSS plugin listed before cssnano', async () => {
  const result = await postcss([
    autoprefixer({ overrideBrowserslist: testTargets }),
    ...litePreset({ browserslist: { query: testTargets } }),
  ]).process(`.example { user-select: none; }`, { from: undefined });
  assert.strictEqual(
    result.css,
    `.example{-ms-user-select:none;user-select:none}`
  );
});
