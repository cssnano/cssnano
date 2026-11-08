import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  childCountOf,
  holdsOnlyDeclarationsOf,
} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import { ruleRecordOf, buildTestRecords } from './liveRecords.js';

const createState = () => new MergeState(['chrome 120'], createRunContext());

/**
 * Builds the records of `css` and absorbs the first rule into the last, so
 * the first rule's record departs the stylesheet.
 *
 * @param {MergeState} state
 * @param {string} css
 */
function departedRecord(state, css) {
  const root = postcss.parse(css);
  state.records = buildTestRecords(root, state);
  const record = ruleRecordOf(state.records, root.first);
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  return record;
}

/**
 * Runs `read` with consistency checks set to `on`, then restores them.
 *
 * @param {boolean} on
 * @param {() => void} read
 */
function withChecks(on, read) {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(on);
  try {
    read();
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
}

test('holdsOnlyDeclarationsOf should be true for a rule of two identical declarations that share one id', () => {
  withChecks(false, () => {
    const state = createState();
    const root = postcss.parse('a{color:red;color:red}');
    state.records = buildTestRecords(root, state);
    const record = ruleRecordOf(state.records, root.first);
    assert.equal(holdsOnlyDeclarationsOf(state.records, record.index), true);
  });
});

test('declarationKeys should return the keys of a departed rule without checks', () => {
  withChecks(false, () => {
    const state = createState();
    const record = departedRecord(state, 'a{color:red}b{color:red}');
    assert.doesNotThrow(() => declarationKeys(state.records, record.index));
  });
});

test('declarationKeys should throw for a departed rule under checks', () => {
  withChecks(true, () => {
    const state = createState();
    const record = departedRecord(state, 'a{color:red}b{color:red}');
    assert.throws(
      () => declarationKeys(state.records, record.index),
      /departed/v
    );
  });
});

test('childCountOf should return the child count of a departed rule without checks', () => {
  withChecks(false, () => {
    const state = createState();
    const record = departedRecord(state, 'a{color:red}b{color:red}');
    assert.doesNotThrow(() => childCountOf(state.records, record.index));
  });
});

test('childCountOf should throw for a departed rule under checks', () => {
  withChecks(true, () => {
    const state = createState();
    const record = departedRecord(state, 'a{color:red}b{color:red}');
    assert.throws(() => childCountOf(state.records, record.index), /departed/v);
  });
});

test('the selectors of a departed rule should be readable without checks', () => {
  withChecks(false, () => {
    const state = createState();
    const record = departedRecord(state, 'a{color:red}b{color:red}');
    assert.doesNotThrow(() => record.selectors);
  });
});

test('the selectors of a departed rule should throw under checks', () => {
  withChecks(true, () => {
    const state = createState();
    const record = departedRecord(state, 'a{color:red}b{color:red}');
    assert.throws(() => record.selectors, /departed/v);
  });
});
