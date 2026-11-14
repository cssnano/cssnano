import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  familiesOf,
  mergeOracleDifference,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

describe('merge oracle: list-style family', () => {
  test('accepts list-style with a position and a type in either order', () => {
    assert.equal(
      mergeOracleDifference(
        'p{list-style:square inside}',
        'p{list-style-position:inside;list-style-type:square;list-style-image:none}'
      ),
      undefined
    );
  });

  test('accepts a lone none as the type and the image together', () => {
    assert.equal(
      mergeOracleDifference(
        'p{list-style:none}',
        'p{list-style-type:none;list-style-image:none}'
      ),
      undefined
    );
  });

  test('accepts a none beside an image as the type', () => {
    assert.equal(
      mergeOracleDifference(
        'p{list-style:url(a.png) none}',
        'p{list-style-type:none;list-style-image:url(a.png)}'
      ),
      undefined
    );
  });

  test('rejects a lone none that would also reset an image the longhands set', () => {
    assert.match(
      mergeOracleDifference(
        'p{list-style-image:url(a.png);list-style-type:none}',
        'p{list-style:none}'
      ) ?? '',
      /list-style-image/v
    );
  });

  test('rejects an inside none, which is ambiguous, so the merge is not a valid value', () => {
    assert.match(
      mergeOracleDifference(
        'p{list-style-type:none;list-style-position:inside;list-style-image:none}',
        'p{list-style:inside none}'
      ) ?? '',
      /list-style-type/v
    );
  });

  test('families of a stylesheet name list-style for its longhands', () => {
    assert.deepEqual(familiesOf('p{list-style-image:none}'), ['list-style']);
  });
});
