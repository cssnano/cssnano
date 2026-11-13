import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { RunContext } from '../../../passes/ir/runContext.js';
/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function counterReducer(encoder: (value: string, index: number) => string): {
    /**
     * @param {ArenaIndex} index
     * @param {BlockRecords} records
     */
    collect(index: ArenaIndex, records: BlockRecords): void;
    /**
     * @param {BlockRecords} records
     * @param {RunContext} context
     */
    transform(records: BlockRecords, context: RunContext): void;
};
//# sourceMappingURL=counter.d.ts.map