import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import postcss from 'postcss';
import { configureValidated } from '../../src/presets/configurePlugins.js';
import { defaultPluginEntries } from '../../src/presets/defaultPlugins.js';

/**
 * The value stages of the default preset, run as the host plugins the preset
 * compiles. A run memoises each value per property, so a value that repeats in
 * one stylesheet is served from the memo; a value that stands alone never is.
 */
const valueStagePlugins = configureValidated(
  defaultPluginEntries.filter(([entry]) => typeof entry !== 'function'),
  {}
);

const frameworks = fileURLToPath(
  new URL('../../../../frameworks/', import.meta.url)
);

/**
 * The value of each declaration of a stylesheet after the stages have run,
 * keyed by property and the source value, with comments, that they read.
 *
 * @param {import('postcss').Root} root
 * @returns {Map<string, string>}
 */
function valuesByKey(root) {
  /** @type {Map<string, string>} */
  const values = new Map();
  root.walkDecls((decl) => {
    const source = decl.raws.value?.raw ?? decl.value;
    const key = `${decl.prop}\0${source}`;
    // Repeats of a key are served from the memo, so each must agree.
    assert.equal(values.get(key) ?? decl.value, decl.value, key);
    values.set(key, decl.value);
  });
  return values;
}

test('each declaration of the frameworks gets the same value in a whole stylesheet, where the memo serves repeats, as alone', async () => {
  /** @type {Map<string, string>} */
  const sources = new Map();
  for (const file of readdirSync(frameworks)) {
    const css = readFileSync(join(frameworks, file), 'utf8');
    const shared = await postcss(valueStagePlugins).process(css, {
      from: undefined,
    });
    for (const [key, value] of valuesByKey(shared.root)) {
      assert.equal(sources.get(key) ?? value, value, key);
      sources.set(key, value);
    }
  }
  for (const [key, shared] of sources) {
    const [prop, source] = key.split('\0');
    const alone = await postcss(valueStagePlugins).process(
      `a{${prop}:${source};}`,
      { from: undefined }
    );
    assert.equal(alone.root.first.first.value, shared, `${prop}: ${source}`);
  }
});
