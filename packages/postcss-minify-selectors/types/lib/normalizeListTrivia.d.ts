export type SelectorArena = import('./arena.js').SelectorArena;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type Output = import('./normalizePool.js').Output;
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./normalizePool.js').Output} Output */
/**
 * Scans a token gap between list entries in a single pass.
 *
 * @param {SelectorArena} arena
 * @param {OutputPool} pool
 * @param {number} start
 * @param {number} end
 * @returns {{ trailing: Output, leading: Output }}
 */
export declare function scanListGap(arena: SelectorArena, pool: OutputPool, start: number, end: number): {
    trailing: Output;
    leading: Output;
};
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export declare function trailingListTrivia(arena: SelectorArena, pool: OutputPool, start: number, end: number): import("./normalizePool.js").Output;
//# sourceMappingURL=normalizeListTrivia.d.ts.map