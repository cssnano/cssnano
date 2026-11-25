import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callCount } from './coverageCounts.js';

/**
 * @param {string} url
 * @param {string} functionName
 * @param {number} count
 * @return {import('node:inspector').Profiler.ScriptCoverage}
 */
function script(url, functionName, count) {
  return {
    scriptId: '1',
    url,
    functions: [
      {
        functionName,
        isBlockCoverage: true,
        ranges: [
          { startOffset: 0, endOffset: 100, count },
          { startOffset: 10, endOffset: 20, count: 99 },
        ],
      },
    ],
  };
}

test('callCount reads the count of the range that spans the function', () => {
  assert.equal(callCount([script('file:///a/m.js', 'f', 3)], '/m.js', 'f'), 3);
});

test('callCount leaves out scripts whose url does not end with the module', () => {
  assert.equal(callCount([script('file:///a/n.js', 'f', 3)], '/m.js', 'f'), 0);
});

test('callCount leaves out functions of another name in the module', () => {
  assert.equal(callCount([script('file:///a/m.js', 'g', 3)], '/m.js', 'f'), 0);
});

test('callCount sums the functions of the same name across matching scripts', () => {
  const coverage = [
    script('file:///a/m.js', 'f', 3),
    script('file:///b/m.js', 'f', 4),
  ];
  assert.equal(callCount(coverage, '/m.js', 'f'), 7);
});
