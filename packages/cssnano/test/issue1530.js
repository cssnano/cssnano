'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const nano = require('..');

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
