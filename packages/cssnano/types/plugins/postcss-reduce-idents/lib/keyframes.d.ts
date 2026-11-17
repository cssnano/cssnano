/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function keyframesReducer(encoder: (value: string, index: number) => string): {
    collect(index: import("../../../ir/blockRecord.js").ArenaIndex, records: import("../../../ir/blockRecords.js").BlockRecords, context: import("../../../run/runContext.js").RunContext): void;
    transform(records: import("../../../ir/blockRecords.js").BlockRecords, context: import("../../../run/runContext.js").RunContext): void;
};
//# sourceMappingURL=keyframes.d.ts.map