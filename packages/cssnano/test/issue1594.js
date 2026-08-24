import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import preset from 'cssnano-preset-default';
import nano from '../src/index.js';

const { test } = nodetest;
const fixture = `
@layer components {
  .O82 { display: flex; }
}
@layer components {
  .tK5 { border: 0; }
}
@layer components {
  .tK1 { font-size: inherit; }
}
`;

const expected =
  '@layer components{.O82{display:flex}.tK5{border:0}.tK1{font-size:inherit}}';

test('should discard empty layers after merging layers', () => {
  const processor = postcss([
    nano({
      preset: preset(),
    }),
  ]);

  return processor
    .process(fixture, { from: undefined })
    .then((result) => assert.strictEqual(result.css, expected));
});
