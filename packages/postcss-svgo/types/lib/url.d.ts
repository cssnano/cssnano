declare const encode: typeof encodeURIComponent;
/**
 * Percent-decodes a string according to WHATWG URL Standard § 1.3
 * (Percent-encoded bytes).
 * @param {string} input
 * @return {string}
 */
declare function decode(input: string): string;
export { encode, decode };
//# sourceMappingURL=url.d.ts.map