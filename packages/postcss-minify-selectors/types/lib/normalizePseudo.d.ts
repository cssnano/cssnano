export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Normalized = import('./normalizeOutput.js').Normalized;
export type Part = import('./normalizeOutput.js').Part;
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @typedef {import('./normalizeOutput.js').Part} Part */
/** @param {OutputPool} pool @param {Output} left @param {Output} right */
export declare function compareOutputs(pool: OutputPool, left: Output, right: Output): -1 | 0 | 1;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized */
export declare function pseudoOutput(arena: SelectorArena, pool: OutputPool, node: ArenaNode, normalized: (Normalized | undefined)[]): import("./normalizePool.js").Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
export declare function compoundOutput(arena: SelectorArena, pool: OutputPool, nodeIndex: number, normalized: (Normalized | undefined)[], children: readonly number[]): import("./normalizePool.js").Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
export declare function complexOutput(arena: SelectorArena, pool: OutputPool, nodeIndex: number, normalized: (Normalized | undefined)[], children: readonly number[]): import("./normalizePool.js").Output | {
    emit?: import("./normalizePool.js").Emit;
    id: number;
    length: number;
    text?: string;
    sourceNode?: number;
    changed?: boolean;
    node: number;
    parts: import("./normalizeOutput.js").Part[];
    trailing: import("./normalizePool.js").Output | undefined;
};
//# sourceMappingURL=normalizePseudo.d.ts.map