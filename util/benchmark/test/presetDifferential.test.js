import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareOutputs } from '../../presetDifferential.js';

test('compareOutputs rejects a candidate that dropped a case', () => {
  assert.throws(
    () =>
      compareOutputs(
        [
          { name: 'a', css: 'x' },
          { name: 'b', css: 'x' },
        ],
        [{ name: 'a', css: 'x' }]
      ),
    /missing b/v
  );
});

test('compareOutputs rejects a candidate that added a case', () => {
  assert.throws(
    () =>
      compareOutputs(
        [{ name: 'a', css: 'x' }],
        [
          { name: 'a', css: 'x' },
          { name: 'c', css: 'x' },
        ]
      ),
    /extra c/v
  );
});

test('compareOutputs counts identical output without listing a difference', () => {
  const { counts, differences } = compareOutputs(
    [{ name: 'a', css: 'a{color:red}' }],
    [{ name: 'a', css: 'a{color:red}' }]
  );

  assert.deepEqual(counts, {
    identical: 1,
    grew: 0,
    shrank: 0,
    'same-length': 0,
    errored: 0,
  });
  assert.deepEqual(differences, []);
});

test('compareOutputs reports a candidate longer than the base as grew', () => {
  const { differences } = compareOutputs(
    [{ name: 'a', css: 'a{}' }],
    [{ name: 'a', css: 'a{color:red}' }]
  );

  assert.deepEqual(
    differences.map(({ name, kind }) => ({ name, kind })),
    [{ name: 'a', kind: 'grew' }]
  );
});

test('compareOutputs reports a candidate shorter than the base as shrank', () => {
  const { differences } = compareOutputs(
    [{ name: 'a', css: 'a{color:red}' }],
    [{ name: 'a', css: 'a{}' }]
  );

  assert.deepEqual(
    differences.map(({ kind }) => kind),
    ['shrank']
  );
});

test('compareOutputs reports output of equal length that differs as same-length', () => {
  // Equal length is not equal output: `red` and `tan` both have 3 letters.
  const { differences } = compareOutputs(
    [{ name: 'a', css: 'a{color:red}' }],
    [{ name: 'a', css: 'a{color:tan}' }]
  );

  assert.deepEqual(
    differences.map(({ kind }) => kind),
    ['same-length']
  );
});

test('compareOutputs reports a case that throws on only one side as errored', () => {
  const { differences } = compareOutputs(
    [{ name: 'a', css: 'a{}' }],
    [{ name: 'a', error: 'Unknown word' }]
  );

  assert.deepEqual(
    differences.map(({ kind }) => kind),
    ['errored']
  );
});

test('compareOutputs does not report a case that throws the same error on both sides', () => {
  const { counts, differences } = compareOutputs(
    [{ name: 'a', error: 'Unknown word' }],
    [{ name: 'a', error: 'Unknown word' }]
  );

  assert.equal(counts.identical, 1);
  assert.deepEqual(differences, []);
});
