import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import stylehacks from '../../src/plugins/stylehacks/index.js';

// 'ie 6 and not ie 6' matches no browser, so the targets are unknown and
// the _color hack may still be needed.
const emptyQuery = 'ie 6 and not ie 6';
const css = 'h1 { _color: #ffffff }';

test('keeps a hack when the query matches no browser, because the targets are unknown', async () => {
  const result = await postcss(
    stylehacks({ overrideBrowserslist: emptyQuery })
  ).process(css, { from: undefined });

  assert.equal(result.css, css);
});

test('warns that the query matches no browser, attributed to cssnano', async () => {
  const result = await postcss(
    stylehacks({ lint: true, overrideBrowserslist: emptyQuery })
  ).process(css, { from: undefined });

  const [warning] = result.warnings();
  assert.match(warning.text, /matches no browser/v);
  assert.equal(warning.plugin, 'cssnano');
});
