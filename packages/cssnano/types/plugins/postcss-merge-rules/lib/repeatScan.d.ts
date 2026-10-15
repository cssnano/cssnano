/**
 * Finds the earliest position whose key a later position repeats. Recording
 * writes is the costly part of a join, so it starts there, and is skipped
 * where no key repeats.
 */
export default class RepeatScan {
    #private;
    start: number;
    /**
     * @param {unknown} key
     * @param {number} position
     */
    see(key: unknown, position: number): void;
}
//# sourceMappingURL=repeatScan.d.ts.map