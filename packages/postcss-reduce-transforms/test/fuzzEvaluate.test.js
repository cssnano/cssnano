import assert from 'node:assert/strict';
import { test } from 'node:test';
import { differences, evaluate } from '../script/lib/fuzzEvaluate.js';

test('evaluates tokenizer number tokens in matrix3d functions', () => {
  const before = evaluate(
    'matrix3d(-0.55,1,0,0,1,1.29,0,0,0,0,1,0,-0.69,-1.4,0,1)'
  );
  const after = evaluate('matrix(-0.55,1,1,1.29,-0.69,-1.4)');

  assert.deepEqual(differences(before, after), []);
});

test('does not report equivalent renamed rotateZ functions as different', () => {
  const before = evaluate('ROTATEZ(-317grad)');
  const after = evaluate('rotate(-317grad)');

  assert.deepEqual(differences(before, after), []);
});
