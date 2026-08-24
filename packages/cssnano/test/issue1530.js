import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import nano from '../src/index.js';

const { test } = nodetest;
const fixture = `
[data--~="is½" i] {
  color: red;
}
`;

const expected = `[data--~="is½" i]{color:red}`;

test('it should keep quote', () => {
  const processor = postcss([nano()]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.strictEqual(r.css, expected));
});
