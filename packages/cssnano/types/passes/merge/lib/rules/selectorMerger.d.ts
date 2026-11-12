/**
 * Rounds of the joins over the records of one run. The records are built and
 * written back by the driver, which runs this after dedupe.
 *
 * @param {import('../../../ir/blockRecords.js').BlockRecords} records the records the driver built
 * @param {readonly string[]} browsers
 * @param {import('../../../ir/runContext.js').RunContext} context the run's state, shared with dedupe
 * @return {void}
 */
export default function runMerge(records: import('../../../ir/blockRecords.js').BlockRecords, browsers: readonly string[], context: import('../../../ir/runContext.js').RunContext): void;
//# sourceMappingURL=selectorMerger.d.ts.map