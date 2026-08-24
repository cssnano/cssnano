import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import preset from 'cssnano-preset-default';
import nano from '../src/index.js';

const { test } = nodetest;
const fixture = `
.b {
  animation: opacity 0ms calc(1000ms);
}
`;

const expected = '.b{animation:opacity 0s calc(1s)}';

test('it should keep quote', () => {
  const processor = postcss([
    nano({
      preset: preset({ calc: false }),
    }),
  ]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.strictEqual(r.css, expected));
});
