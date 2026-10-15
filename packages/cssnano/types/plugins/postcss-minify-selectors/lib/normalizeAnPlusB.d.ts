/**
 * Normalizes an An+B formula tokens slice into canonical serialized form.
 *
 * @param {readonly import('./tokenUtils.js').CSSToken[]} input
 * @param {number} start
 * @param {number} end
 */
export declare function normalizeAnPlusB(input: readonly import('./tokenUtils.js').CSSToken[], start: number, end: number): {
    formula: {
        isTwoNPlusOne: boolean;
    };
    important: boolean;
    text: string;
} | undefined;
//# sourceMappingURL=normalizeAnPlusB.d.ts.map