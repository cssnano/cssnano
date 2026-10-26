/**
 * Normalizes an An+B formula tokens slice into canonical serialized form.
 * `tokenStart` and `tokenEnd` bound the formula's significant tokens. When
 * `spelled` is true, those tokens spell `text`.
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
    tokenStart: number;
    tokenEnd: number;
    spelled: boolean;
} | undefined;
//# sourceMappingURL=normalizeAnPlusB.d.ts.map