import MergeState from './mergeState.js';
import { liveEntryCount } from './liveEntryCount.js';
import { joinNonAdjacent } from './nonAdjacentMerge.js';
import runScan from './scan.js';
import {
  assertNoOverDuplication,
  tallyDeclarations,
} from './overDuplication.js';
import {
  assertContextsCurrent,
  assertRecordsWellFormed,
} from './recordsCheck.js';

const ROUNDS = 'runMerge repeats past its bound on rounds';

/**
 * Rounds of the joins over the records of one run. The records are built and
 * written back by the driver, which runs this after dedupe.
 *
 * @param {import('./blockRecords.js').BlockRecords} records the records the driver built
 * @param {readonly string[]} browsers
 * @param {import('../../../ir/runContext.js').RunContext} context the run's state, shared with dedupe
 * @return {void}
 */
export default function runMerge(records, browsers, context) {
  // The scan runs first because a join by selector can remove a
  // shared declaration that would have merged more selectors. Its merges
  // can leave same-selector rules apart, so the joins repeat until none apply.
  //
  // Rounds: at most N + D + 1, for N rules and at-rules and D declarations
  // at the start. A round after the first needs a join that removed a node
  // or withdrew at least one declaration. No rewrite adds a declaration. A
  // partial merge is the only rewrite that adds a node, one net, and it
  // removes at least one declaration, as does a trimming join. So at most D
  // rewrites add a node or withdraw a declaration, and at most N + D joins
  // remove a node or withdraw one. The sweeps per round are bounded by
  // `sweepPotential`, which is finite, though too large to enforce as a cap.
  const mergeState = new MergeState(browsers, context);
  mergeState.records = records;
  // The bound counts what dedupe left, so it is taken here and not at the build.
  mergeState.maxRounds = liveEntryCount(records) + 1;
  // What dedupe left is the input the over-duplication check compares with.
  const input = records.consistencyChecks ? tallyDeclarations(records) : null;
  let joined;
  let rounds = 0;
  do {
    if (++rounds > mergeState.maxRounds) throw new Error(ROUNDS);
    runScan(mergeState);
    assertRecordsWellFormed(mergeState);
    assertNoOverDuplication(mergeState.records, input);
    joined = joinNonAdjacent(mergeState.records.root, mergeState);
    assertRecordsWellFormed(mergeState);
    assertNoOverDuplication(mergeState.records, input);
  } while (joined);
  // Sweeps and joins edit only the records, and the driver writes them back
  // once. The contexts are checked here and not at the checkpoints, which
  // would hide stale reads that production makes.
  assertContextsCurrent(mergeState);
}
