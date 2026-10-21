import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  familiesOf,
  mergeOracleDifference,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

describe('merge oracle: column-rule family', () => {
  test('accepts a column-rule shorthand with one style split into its longhands, with the initial width and color', () => {
    assert.equal(
      mergeOracleDifference(
        'p{column-rule:dashed}',
        'p{column-rule-width:medium;column-rule-style:dashed;column-rule-color:currentcolor}'
      ),
      undefined
    );
  });

  test('accepts column-rule components in either order', () => {
    assert.equal(
      mergeOracleDifference(
        'p{column-rule:red 1px solid}',
        'p{column-rule-width:1px;column-rule-style:solid;column-rule-color:red}'
      ),
      undefined
    );
  });

  test('rejects dropping the color of a column-rule shorthand that sets it', () => {
    assert.match(
      mergeOracleDifference(
        'p{column-rule:red}',
        'p{column-rule-width:medium;column-rule-style:none}'
      ) ?? '',
      /column-rule-color/v
    );
  });

  test('rejects column-rule with two styles, which the browser ignores', () => {
    assert.match(
      mergeOracleDifference(
        'p{column-rule:solid dashed}',
        'p{column-rule-style:dashed}'
      ) ?? '',
      /column-rule-style/v
    );
  });

  test('families of a stylesheet name column-rule for its shorthand and longhands', () => {
    assert.deepEqual(familiesOf('p{column-rule-style:none}'), ['column-rule']);
  });
});

describe('merge oracle: row-rule family', () => {
  test('rejects a row-rule shorthand rewritten with the initial medium width on the row axis', () => {
    assert.match(
      mergeOracleDifference(
        'p{row-rule:thin solid}',
        'p{row-rule-width:medium;row-rule-style:solid;row-rule-color:currentcolor}'
      ) ?? '',
      /row-rule-width/v
    );
  });

  test('families of a stylesheet name row-rule for its shorthand and longhands', () => {
    assert.deepEqual(familiesOf('p{row-rule:none}'), ['row-rule']);
  });
});

describe('merge oracle: rule family', () => {
  test('accepts a rule shorthand as the column-rule and row-rule shorthands together', () => {
    assert.equal(
      mergeOracleDifference(
        'p{rule:1px dashed red}',
        'p{column-rule:1px dashed red;row-rule:1px dashed red}'
      ),
      undefined
    );
  });

  test('rejects a rule shorthand whose row-rule width differs from its column-rule width', () => {
    assert.match(
      mergeOracleDifference(
        'p{rule:thin solid}',
        'p{column-rule:thin solid;row-rule:medium solid}'
      ) ?? '',
      /row-rule-width/v
    );
  });

  test('accepts rule-width as the column-rule-width and row-rule-width longhands', () => {
    assert.equal(
      mergeOracleDifference(
        'p{rule-width:thin}',
        'p{column-rule-width:thin;row-rule-width:thin}'
      ),
      undefined
    );
  });

  test('families of a stylesheet name rule for its shorthand and its aliases', () => {
    assert.deepEqual(familiesOf('p{rule-color:red}'), ['rule']);
  });
});
