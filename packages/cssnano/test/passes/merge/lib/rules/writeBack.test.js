import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';

/** @import {Container, Root} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext();
  const state = new MergeState(['chrome 120'], context);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('a second write-back should leave the child array of a block that already matches as it is', () => {
  const { root, state } = setup(
    '@media (x){a{color:red}}@media (y){b{width:1px}}'
  );
  const sequence = new RuleSequence(state.records);
  const first = /** @type {any} */ (sequence.head.next);
  sequence.moveIntoParent(first, first.next);
  sequence.write();
  const media = /** @type {Container} */ (root.first);
  const kept = media.nodes;
  sequence.write();
  assert.equal(media.nodes, kept);
  assert.doesNotThrow(() => assertRecordsMatchTree(state));
});
