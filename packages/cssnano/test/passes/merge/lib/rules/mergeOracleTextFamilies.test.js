import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  familiesOf,
  mergeOracleDifference,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

describe('merge oracle: text-emphasis family', () => {
  test('accepts a two-keyword style and a color in one shorthand', () => {
    assert.equal(
      mergeOracleDifference(
        'p{text-emphasis:filled dot red}',
        'p{text-emphasis-style:filled dot;text-emphasis-color:red}'
      ),
      undefined
    );
  });

  test('accepts none for both longhands', () => {
    assert.equal(
      mergeOracleDifference(
        'p{text-emphasis:none}',
        'p{text-emphasis-style:none;text-emphasis-color:currentcolor}'
      ),
      undefined
    );
  });

  test('rejects a shorthand that drops a color the longhand sets', () => {
    assert.match(
      mergeOracleDifference(
        'p{text-emphasis-style:dot;text-emphasis-color:red}',
        'p{text-emphasis:dot}'
      ) ?? '',
      /text-emphasis-color/v
    );
  });

  test('rejects a shorthand that drops a style the longhand sets', () => {
    assert.match(
      mergeOracleDifference(
        'p{text-emphasis:circle}',
        'p{text-emphasis-color:currentcolor}'
      ) ?? '',
      /text-emphasis-style/v
    );
  });

  test('families of a stylesheet name text-emphasis for its longhands', () => {
    assert.deepEqual(familiesOf('p{text-emphasis-color:red}'), [
      'text-emphasis',
    ]);
  });
});

describe('merge oracle: text-decoration family', () => {
  test('accepts a shorthand with a line, a style, a color and a thickness', () => {
    assert.equal(
      mergeOracleDifference(
        'p{text-decoration:underline wavy red 2px}',
        'p{text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:red;text-decoration-thickness:2px}'
      ),
      undefined
    );
  });

  test('rejects a shorthand that resets a thickness the longhand sets', () => {
    assert.match(
      mergeOracleDifference(
        'p{text-decoration-line:underline;text-decoration-thickness:2px}',
        'p{text-decoration:underline}'
      ) ?? '',
      /text-decoration-thickness/v
    );
  });

  test('rejects a shorthand that resets a style to solid when the longhand sets wavy', () => {
    assert.match(
      mergeOracleDifference(
        'p{text-decoration-style:wavy}',
        'p{text-decoration:none}'
      ) ?? '',
      /text-decoration-style/v
    );
  });

  test('families of a stylesheet name text-decoration for its longhands', () => {
    assert.deepEqual(familiesOf('p{text-decoration-thickness:auto}'), [
      'text-decoration',
    ]);
  });
});
