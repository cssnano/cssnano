import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';
import normalizeString from '../../src/plugins/postcss-normalize-string/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';

describe('Value reducers edit the buffer tokens in place', () => {
  test("convert-values edits the value buffer's tokens without a text edit", () => {
    const reduce = convertValues.create({}, ['defaults']).forProperty('margin');
    const buffer = new ValueBuffer('red 1.50em');
    const [kept] = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.text(), 'red 1.5em');
    assert.equal(buffer.tokens()[0], kept);
  });

  test("normalize-string edits the value buffer's tokens without a text edit", () => {
    const reduce = normalizeString.create({}).forProperty('content');
    const buffer = new ValueBuffer("red 'a'");
    const [kept] = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.text(), 'red "a"');
    assert.equal(buffer.tokens()[0], kept);
  });
});
