import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processAllWithLimits } from '../script/lib/fuzzCrossBlock.js';

test('child-process runner reports the input that did not terminate', () => {
  const result = processAllWithLimits(['.a{color:red}'], {
    pluginUrl: 'data:text/javascript,export default () => { for (;;); }',
    timeout: 1000,
  });
  assert.equal(result.terminated, true);
});
