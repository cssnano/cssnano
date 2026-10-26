export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export declare function attributeOutput(arena: SelectorArena, pool: OutputPool, node: ArenaNode): import("./normalizePool.js").Output;
//# sourceMappingURL=attributeOutput.d.ts.map