import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import postcss from 'postcss';
import { isFixedPointSelector } from '../../src/plugins/postcss-minify-selectors/lib/fixedPointSelector.js';
import { normalizeList } from '../../src/plugins/postcss-minify-selectors/lib/selectorScanner.js';

const frameworksDir = new URL('../../../../frameworks/', import.meta.url)
  .pathname;

/** @param {Iterable<string>} selectors */
function assertFixedPointsUnchanged(selectors) {
  let accepted = 0;
  for (const selector of new Set(selectors)) {
    if (!isFixedPointSelector(selector)) continue;
    accepted++;
    assert.equal(
      normalizeList(selector, true, true, false, false),
      selector,
      selector
    );
  }
  return accepted;
}

test('every framework selector the fixed-point check accepts is left unchanged', () => {
  const selectors = [];
  for (const file of readdirSync(frameworksDir)) {
    if (!file.endsWith('.css')) continue;
    const css = readFileSync(join(frameworksDir, file), 'utf8');
    postcss.parse(css).walkRules((rule) => selectors.push(rule.selector));
  }
  assert.ok(assertFixedPointsUnchanged(selectors) > 0);
});
