import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import { selectorItemsOf } from '../../../src/passes/ir/selectorItems.js';
import { tokens as tokenize } from '../../../src/utils/value.js';

// Every rule of the framework stylesheets: the items of each selector as the
// token splitter gives them equal PostCSS's `rule.selectors`. Reads about 30k
// rules, so it lives here rather than in test/.
const frameworksDir = new URL('../../../../../frameworks/', import.meta.url);

test('the items of every framework rule equal PostCSS rule.selectors', () => {
  let rules = 0;
  for (const file of readdirSync(frameworksDir).toSorted()) {
    const css = readFileSync(new URL(file, frameworksDir), 'utf8');
    postcss.parse(css).walkRules((rule) => {
      rules++;
      assert.deepEqual(
        selectorItemsOf(tokenize(rule.selector)),
        rule.selectors,
        `${file}: ${rule.selector}`
      );
    });
  }
  assert.ok(rules > 0);
});
