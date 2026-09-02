import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCases, runFuzz } from '../script/fuzz.js';

test('selector differential fuzzer is deterministic and covers grammar branches', async () => {
  assert.deepEqual(generateCases(1234, 40), generateCases(1234, 40));
  const result = await runFuzz({ seed: 1234, count: 300 });
  assert.ok(result.shapes >= 30);
});

test('second fixed selector differential seed remains compatible', async () => {
  await runFuzz({ seed: 0xdecafbad, count: 300 });
});
