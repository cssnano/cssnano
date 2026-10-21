import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executionCount, fragmentOffset } from './fragmentReach.js';

const source =
  'function f(a) {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}\n';

test('fragmentOffset points at the first code character the mutation wrote', () => {
  const offset = fragmentOffset(source, {
    find: '    return 1;',
    replace: '    return 3;',
  });
  const mutated = source.replace('    return 1;', '    return 3;');
  assert.equal(mutated.slice(offset, offset + 9), 'return 3;');
});

test('fragmentOffset points a deletion at the code that follows it', () => {
  const offset = fragmentOffset(source, {
    find: '  if (a) {\n    return 1;\n  }\n',
    replace: '',
  });
  const mutated = source.replace('  if (a) {\n    return 1;\n  }\n', '');
  assert.equal(mutated.slice(offset, offset + 9), 'return 2;');
});

test('executionCount reads the innermost block around the offset, not the function that encloses it', () => {
  const functions = [
    {
      ranges: [
        { startOffset: 0, endOffset: 100, count: 5 },
        { startOffset: 20, endOffset: 40, count: 0 },
      ],
    },
  ];
  assert.equal(executionCount(functions, 30), 0);
});

test('executionCount reads an uncalled inner function over the block of its caller', () => {
  const functions = [
    { ranges: [{ startOffset: 0, endOffset: 100, count: 5 }] },
    { ranges: [{ startOffset: 20, endOffset: 40, count: 0 }] },
  ];
  assert.equal(executionCount(functions, 30), 0);
});

test('executionCount treats an offset outside every block as never executed', () => {
  assert.equal(
    executionCount(
      [{ ranges: [{ startOffset: 0, endOffset: 10, count: 3 }] }],
      10
    ),
    0
  );
});
