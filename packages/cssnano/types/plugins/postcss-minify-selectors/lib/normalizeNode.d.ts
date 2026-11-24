export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Specificity = import('./arena.js').Specificity;
export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type Normalized = import('./normalizeOutput.js').Normalized;
export type Part = import('./normalizeOutput.js').Part;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} outerSort */
export declare function normalizeNode(arena: SelectorArena, pool: OutputPool, nodeIndex: number, normalized: (Normalized | undefined)[], outerSort: boolean): import("./normalizeOutput.js").Normalized;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} entries @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean}} options */
export declare function finalizeEntries(arena: SelectorArena, pool: OutputPool, entries: Normalized[], options: {
    sort?: boolean;
    convertToIs?: boolean;
    keyframe?: boolean;
}): import("./outputOverlay.js").Emit | undefined;
//# sourceMappingURL=normalizeNode.d.ts.map