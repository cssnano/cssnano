import { test } from 'node:test';
import assert from 'node:assert/strict';
import normalizePositions from '../../src/plugins/postcss-normalize-positions/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { ident } from '../../src/values/tokenConstructors.js';

test("normalize-positions reads an edited buffer's tokens, not its text", () => {
  const reduce = normalizePositions.create().forProperty('background-position');
  const buffer = new ValueBuffer('x');
  buffer.replace(0, 1, [ident('center')]);
  const read = buffer.text.bind(buffer);
  let reads = 0;
  buffer.text = () => {
    reads++;
    return read();
  };
  reduce(buffer, 0);
  assert.equal(reads, 0);
  assert.equal(read(), '50%');
});
