import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';
const oldProcessor = postcss([oldPlugin()]);
const newProcessor = postcss([plugin()]);
function compare(css) {
  return [
    oldProcessor.process(css, {
      from: undefined,
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    }).css,
    newProcessor.process(css, {
      from: undefined,
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    }).css,
  ];
}
test('preserves output against the legacy unicode parser', () => {
  for (const css of edgeCases)
    assert.deepEqual(compare(css)[1], compare(css)[0], css);
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (let i = 0; i < 300; i++) {
      const css = randRule(rng);
      // The CSSTools migration intentionally fixes nested component values;
      // the legacy parser did not visit words inside arbitrary functions.
      if (
        /(?:foo|var|calc|env)\(/.test(css) ||
        css.includes('??????') ||
        css.includes('unicode-range: ')
      ) {
        continue;
      }
      const [oldOut, newOut] = compare(css);
      assert.equal(
        newOut,
        oldOut,
        `seed ${seed}, input: ${css}\nold: ${oldOut}\nnew: ${newOut}`
      );
    }
  }
});
