import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  assertFamilyCoverage,
  familiesOf,
  generateFamilyCases,
  generateResetCases,
  mergeOracleDifference,
  modelledFamilies,
  unmodelledFamilies,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';
import { cascadedDeclarations } from '../../../../../script/passes/merge/rules/lib/cascadeOracle.js';

describe('merge oracle: composed cascade and family evaluation', () => {
  test('accepts a rewrite that keeps every element and environment equal', () => {
    assert.equal(
      mergeOracleDifference(
        'p{border-top-width:1px;border-top-style:solid}',
        'p{border-top:1px solid}'
      ),
      undefined
    );
  });

  test('rejects a border width change through the border evaluator', () => {
    assert.match(
      mergeOracleDifference(
        'p{border-top-width:1px}',
        'p{border-top-width:2px}'
      ) ?? '',
      /border-top-width/v
    );
  });

  test('rejects a column count change through the columns evaluator', () => {
    assert.match(
      mergeOracleDifference('p{columns:10px 2}', 'p{columns:10px 3}') ?? '',
      /column-count/v
    );
  });

  test('rejects a change to the physical side a logical property maps to', () => {
    assert.match(
      mergeOracleDifference(
        'p{margin-inline-start:1px}',
        'p{margin-left:1px}',
        { direction: 'rtl' }
      ) ?? '',
      /margin/v
    );
  });

  test('accepts a logical property that maps to the same side in ltr', () => {
    assert.equal(
      mergeOracleDifference(
        'p{margin-inline-start:1px}',
        'p{margin-left:1px}',
        { direction: 'ltr' }
      ),
      undefined
    );
  });

  test('rejects moving a padding declaration from before all to after it', () => {
    assert.match(
      mergeOracleDifference(
        'p{padding:1px;all:unset}',
        'p{all:unset;padding:1px}'
      ) ?? '',
      /padding/v
    );
  });

  test('accepts dropping a padding declaration that a later all resets', () => {
    assert.equal(
      mergeOracleDifference('p{padding:1px;all:unset}', 'p{all:unset}'),
      undefined
    );
  });

  test('rejects letting a family declaration of another rule pass all', () => {
    assert.notEqual(
      mergeOracleDifference(
        '.a{column-count:2}.a{all:initial}',
        '.a{all:initial}.a{column-count:2}'
      ),
      undefined
    );
  });

  test('rejects a reordering that changes which declaration wins', () => {
    assert.notEqual(
      mergeOracleDifference(
        'p{border-top-width:1px;border-top-width:2px}',
        'p{border-top-width:2px;border-top-width:1px}'
      ),
      undefined
    );
  });
});

describe('merge oracle: family generator and coverage', () => {
  test('generated families cover every modelled family', () => {
    assert.doesNotThrow(() =>
      assertFamilyCoverage(generateFamilyCases(7, 300))
    );
  });

  test('coverage check rejects a corpus that misses a modelled family', () => {
    assert.throws(
      () => assertFamilyCoverage(generateFamilyCases(7, 1)),
      /missing family/v
    );
  });

  test('generator emits no family that the oracle leaves unmodelled', () => {
    const emitted = new Set(
      generateFamilyCases(7, 300).flatMap(({ css }) => familiesOf(css))
    );
    for (const family of unmodelledFamilies) {
      assert.ok(!emitted.has(family), family);
    }
  });

  test('families of a stylesheet name the modelled families it declares', () => {
    assert.deepEqual(familiesOf('p{columns:2;margin:0}'), ['box', 'columns']);
  });

  test('modelled and unmodelled families are disjoint', () => {
    const modelled = new Set(modelledFamilies);
    assert.equal(
      unmodelledFamilies.filter((family) => modelled.has(family)).length,
      0
    );
  });

  test('reset cases often apply all and a modelled family to one element, so that a merge can move one past the other', () => {
    const cases = generateResetCases(7, 300);
    const meeting = cases.filter(({ css }) =>
      [...cascadedDeclarations(css).values()].some(
        (applied) =>
          applied.some(({ prop }) => prop.toLowerCase() === 'all') &&
          familiesOf(
            `a{${applied.map(({ prop, value }) => `${prop}:${value}`).join(';')}}`
          ).length > 0
      )
    );
    assert.ok(meeting.length >= cases.length / 10, `${meeting.length}`);
  });

  test('generated cases parse as CSS', () => {
    for (const { css } of generateFamilyCases(11, 50)) {
      assert.doesNotThrow(() => postcss.parse(css));
    }
  });
});
