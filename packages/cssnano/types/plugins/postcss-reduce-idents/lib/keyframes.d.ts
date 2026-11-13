/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function keyframesReducer(encoder: (value: string, index: number) => string): {
    collect(index: import("../../../passes/ir/blockRecord.js").ArenaIndex, records: import("../../../passes/ir/blockRecords.js").BlockRecords, context: import("../../../passes/ir/runContext.js").RunContext): void;
    transform(records: import("../../../passes/ir/blockRecords.js").BlockRecords, context: import("../../../passes/ir/runContext.js").RunContext): void;
};
//# sourceMappingURL=keyframes.d.ts.map