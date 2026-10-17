/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>} whether the value is a plain
 * object: an object literal (from any realm) or one with no prototype, not an
 * array, a Map, a Date or an instance of a class
 */
export default function isRecord(value: unknown): value is Record<string, unknown>;
//# sourceMappingURL=isRecord.d.ts.map