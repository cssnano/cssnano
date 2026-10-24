import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the plugin loads it, so both load
// after it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: colormin } =
  await import('../../src/plugins/postcss-colormin/index.js');
const { ValueBuffer } = await import('../../src/values/valueBuffer.js');

/**
 * @param {string} value
 * @returns {number} tokenize calls colormin makes after the buffer's first read
 */
function tokenizeCalls(value) {
  const buffer = new ValueBuffer(value);
  buffer.tokens();
  counter.calls.clear();
  colormin.create({}, ['defaults']).forProperty('color')(buffer, 0);
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

suite('colormin tokenizes the value it reads', () => {
  test('colormin tokenizes a function-form result once', () => {
    assert.equal(tokenizeCalls('rgb(255 0 0 / 50%)'), 1);
  });

  test('colormin does not tokenize a value with no color function', () => {
    assert.equal(tokenizeCalls('1px solid'), 0);
  });
});

suite('colormin leaves an unchanged value unedited', () => {
  test('colormin leaves the buffer unedited when no color changes', () => {
    const reduce = colormin.create({}, ['defaults']).forProperty('color');
    const buffer = new ValueBuffer('transparent');
    const list = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), false);
    assert.equal(buffer.tokens(), list);
  });

  test('colormin keeps a color function with a comment inside unchanged', () => {
    const reduce = colormin.create({}, ['defaults']).forProperty('color');
    const buffer = new ValueBuffer('rgb(1 /* c */ 2 3)');
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), false);
    assert.equal(buffer.text(), 'rgb(1 /* c */ 2 3)');
  });
});
