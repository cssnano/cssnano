export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Normalized = import('./normalizeOutput.js').Normalized;
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @param {OutputPool} pool @param {readonly Normalized[]} entries */
export declare function joinEntries(pool: OutputPool, entries: readonly Normalized[]): import("./normalizePool.js").Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} sort @param {readonly number[]} children */
export declare function listOutput(arena: SelectorArena, pool: OutputPool, nodeIndex: number, normalized: (Normalized | undefined)[], sort: boolean, children: readonly number[]): import("./normalizePool.js").Output | {
    emit?: import("./normalizePool.js").Emit;
    id: number;
    length: number;
    text?: string;
    sourceNode?: number;
    changed?: boolean;
    entries: import("./normalizeOutput.js").Normalized[];
};
//# sourceMappingURL=normalizeList.d.ts.map