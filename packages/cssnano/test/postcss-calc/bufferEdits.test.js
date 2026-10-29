import { test } from 'node:test';
import assert from 'node:assert/strict';
import calc from '../../src/plugins/postcss-calc/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';

test('postcss-calc makes one buffer edit for a value with several reductions', () => {
  const buffer = new ValueBuffer(
    'calc(1px + 2px) calc(3px + 4px) calc(5px + 6px)'
  );
  let edits = 0;
  const replace = buffer.replace.bind(buffer);
  const replaceRanges = buffer.replaceRanges.bind(buffer);
  buffer.replace = (...args) => {
    edits++;
    return replace(...args);
  };
  buffer.replaceRanges = (edit) => {
    edits++;
    return replaceRanges(edit);
  };
  calc.create({}).forProperty('width')(buffer, 0);
  assert.equal(edits, 1);
});
