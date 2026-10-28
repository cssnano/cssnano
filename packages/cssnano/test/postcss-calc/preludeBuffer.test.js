import { test } from 'node:test';
import assert from 'node:assert/strict';
import calc from '../../src/plugins/postcss-calc/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { tokensText } from '../../src/values/tokensText.js';

test("postcss-calc's prelude reducer's edited tokens spell `text()`", () => {
  const { buffer: reduce } = calc
    .create({ mediaQueries: true })
    .forAtRule('media');
  const buffer = new ValueBuffer('(min-width: calc(1px + 1px))');
  reduce(buffer, 0);
  assert.equal(tokensText(buffer.tokens()), buffer.text());
});

test("postcss-calc's prelude reducer reduces a calc() in an at-rule prelude", () => {
  const { buffer: reduce } = calc
    .create({ mediaQueries: true })
    .forAtRule('media');
  const buffer = new ValueBuffer('(min-width: calc(1px + 1px))');
  reduce(buffer, 0);
  assert.equal(buffer.text(), '(min-width: calc(2px))');
});
