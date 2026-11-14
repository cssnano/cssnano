import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  familiesOf,
  mergeOracleDifference,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

describe('merge oracle: border-block and border-inline families', () => {
  test('accepts border-block with equal start and end sides', () => {
    assert.equal(
      mergeOracleDifference(
        'p{border-block:1px solid red}',
        'p{border-block-start:1px solid red;border-block-end:1px solid red}'
      ),
      undefined
    );
  });

  test('rejects border-block over sides that differ, because the shorthand gives both one value', () => {
    assert.match(
      mergeOracleDifference(
        'p{border-block:1px solid red}',
        'p{border-block-start:1px solid red;border-block-end:2px solid red}'
      ) ?? '',
      /border-bottom-width/v
    );
  });

  test('accepts border-inline with equal start and end sides', () => {
    assert.equal(
      mergeOracleDifference(
        'p{border-inline:none}',
        'p{border-inline-start:none;border-inline-end:none}'
      ),
      undefined
    );
  });

  test('rejects border-inline that drops the style of one side', () => {
    assert.match(
      mergeOracleDifference(
        'p{border-inline:1px solid red}',
        'p{border-inline-start:1px solid red;border-inline-end:1px red}'
      ) ?? '',
      /border-right-style/v
    );
  });

  test('families of a stylesheet name the logical border row for border-block', () => {
    assert.deepEqual(familiesOf('p{border-block-end-color:red}'), [
      'border-logical',
    ]);
  });
});
