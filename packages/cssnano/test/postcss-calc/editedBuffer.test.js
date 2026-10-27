import { test } from 'node:test';
import assert from 'node:assert/strict';
import calc from '../../src/plugins/postcss-calc/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { tokens } from '../../src/utils/value.js';

test("postcss-calc reads an edited buffer's tokens, not its text", () => {
  const { selector } = calc.create({ selectors: true });
  const buffer = new ValueBuffer('x');
  buffer.replace(0, 1, tokens('calc(1px + 2px)'));
  const read = buffer.text.bind(buffer);
  let reads = 0;
  buffer.text = () => {
    reads++;
    return read();
  };
  selector(buffer, 0);
  assert.equal(reads, 0);
  assert.equal(read(), '3px');
});
