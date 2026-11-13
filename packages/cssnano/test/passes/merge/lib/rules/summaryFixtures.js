/** @import {BlockRecords} from '../../../../../src/passes/ir/blockRecords.js' */
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildTestRecords, ruleRecordOf } from './liveRecords.js';

/**
 * A stylesheet built and folded the way the driver builds it, so each rule has
 * its summaries and its selector ids in one table of lists.
 *
 * @param {string} css
 * @param {readonly string[]} [browsers]
 * @return {{state: MergeState, records: BlockRecords, rules: number[]}} the
 * arena indices of the top-level rules, in document order
 */
export function foldedRules(css, browsers = ['chrome 120']) {
  const root = postcss.parse(css);
  const state = new MergeState(browsers);
  const records = buildTestRecords(root, state);
  state.records = records;
  const rules = root.nodes.map((node) => ruleRecordOf(records, node).index);
  return { state, records, rules };
}
