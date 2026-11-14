import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  familiesOf,
  mergeOracleDifference,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

describe('merge oracle: grid placement family', () => {
  test('accepts grid-row with a lone identifier that also names the end', () => {
    assert.equal(
      mergeOracleDifference(
        'p{grid-row:a}',
        'p{grid-row-start:a;grid-row-end:a}'
      ),
      undefined
    );
  });

  test('rejects grid-row with a lone identifier that the end does not repeat, because the end would be auto', () => {
    assert.match(
      mergeOracleDifference(
        'p{grid-row:a}',
        'p{grid-row-start:a;grid-row-end:auto}'
      ) ?? '',
      /grid-row-end/v
    );
  });

  test('accepts grid-row with a line number and an omitted auto end', () => {
    assert.equal(
      mergeOracleDifference(
        'p{grid-row:1}',
        'p{grid-row-start:1;grid-row-end:auto}'
      ),
      undefined
    );
  });

  test('rejects grid-column that writes a different end than the shorthand gives', () => {
    assert.match(
      mergeOracleDifference(
        'p{grid-column:1 / 2}',
        'p{grid-column-start:1;grid-column-end:auto}'
      ) ?? '',
      /grid-column-end/v
    );
  });

  test('accepts grid-area with a column end that the column start gives', () => {
    assert.equal(
      mergeOracleDifference(
        'p{grid-area:a / b}',
        'p{grid-row-start:a;grid-column-start:b;grid-row-end:a;grid-column-end:b}'
      ),
      undefined
    );
  });

  test('rejects grid-area that drops a column end the grammar would not fill in', () => {
    assert.match(
      mergeOracleDifference(
        'p{grid-area:a / b / a / auto}',
        'p{grid-area:a / b / a}'
      ) ?? '',
      /grid-column-end/v
    );
  });

  test('families of a stylesheet name grid-placement for its shorthands and longhands', () => {
    assert.deepEqual(familiesOf('p{grid-column-end:auto}'), ['grid-placement']);
  });
});
