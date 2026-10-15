export type ListMode = import('./arena.js').ListMode;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
export declare function explicitCombinator(input: readonly import('./tokenUtils.js').CSSToken[], index: number): {
    value: string;
    end: number;
} | undefined;
/** @param {ListMode} mode @param {readonly object[]} parts */
export declare function allowsLeadingCombinator(mode: ListMode, parts: readonly object[]): boolean;
/** @param {ListMode} mode @param {readonly {kind:string}[]} parts */
export declare function violatesComplexMode(mode: ListMode, parts: readonly {
    kind: string;
}[]): boolean;
//# sourceMappingURL=parseArenaCombinators.d.ts.map