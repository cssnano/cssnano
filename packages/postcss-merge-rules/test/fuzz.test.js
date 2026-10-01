import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCoverage,
  check,
  generateCases,
  report,
} from '../script/fuzz.js';
import { runFuzz } from '../../../util/fuzzRunner.js';

function fuzz(seed, count) {
  return runFuzz({
    cases: generateCases(seed, count),
    check,
    report: (failure, _seed, index) => report(failure, seed, index),
    count,
    seed,
    interval: 0,
    exitOnFailure: false,
  });
}

test('selector differential fuzzer generates deterministic cases', () => {
  assert.deepEqual(generateCases(1234, 40), generateCases(1234, 40));
});

test('selector differential fuzzer cases cover grammar branches and shapes', () => {
  assert.doesNotThrow(() => assertCoverage(generateCases(1234, 300)));
});

test('selector differential coverage check rejects too few cases', () => {
  assert.throws(() => assertCoverage(generateCases(1234, 3)));
});

test('selector differential fuzzer seed 1234 remains compatible', () => {
  assert.equal(fuzz(1234, 300).passed, 300);
});

test('second fixed selector differential seed remains compatible', () => {
  assert.equal(fuzz(0xdecafbad, 300).passed, 300);
});

test('selector differential fuzzer generates selectors invalid by construction', () => {
  assert.ok(generateCases(1234, 300).some((item) => item.invalid));
});

test('selector differential fuzzer keeps invalid selectors in short corpora', () => {
  assert.ok(generateCases(1234, 40).some((item) => item.invalid));
});

test('selector differential fuzzer does not flag a valid selector as invalid', () => {
  const valid = generateCases(1234, 300).filter((item) => !item.invalid);
  assert.ok(valid.length > 0);
  assert.ok(valid.every((item) => item.branch !== 'invalid-selector'));
});

test('selector differential coverage check rejects a corpus without invalid selectors', () => {
  const valid = generateCases(1234, 300).filter((item) => !item.invalid);
  assert.throws(() => assertCoverage(valid), /invalid/v);
});

test('selector differential fuzzer expects an invalid selector to stay unmerged', () => {
  const item = {
    selector: 'a||b',
    branch: 'invalid-selector',
    browsers: 'Chrome 120',
    invalid: true,
  };
  assert.equal(check(item), undefined);
});

test('selector differential fuzzer reports an invalid selector the plugin would merge', () => {
  const item = {
    selector: 'a',
    branch: 'invalid-selector',
    browsers: 'Chrome 120',
    invalid: true,
  };
  assert.deepEqual(check(item)?.expected, 'a{color:red}b{color:red}');
});
