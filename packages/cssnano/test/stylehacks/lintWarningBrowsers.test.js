import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import bugs from '../../src/utils/data/bugs.json' with { type: 'json' };
import stylehacks from '../../src/plugins/stylehacks/index.js';

const BUG = 'stylehacks-leading-underscore-ie6';

test('lint warning lists the browsers that the hack affects', async () => {
  const result = await postcss(
    stylehacks({ lint: true, overrideBrowserslist: ['chrome 150'] })
  ).process('h1 { _color: #ffffff }', { from: undefined });

  const [warning] = result.warnings();
  const payload = JSON.parse(warning.text.slice(warning.text.indexOf('{')));

  assert.deepEqual(payload.browsers, bugs[BUG].browsers);
});
