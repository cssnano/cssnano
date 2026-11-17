/**
 * @typedef {import('./arena.js').SelectorArena} SelectorArena
 * @typedef {import('./arena.js').NodeKind} NodeKind
 */
export type SelectorArena = import('./arena.js').SelectorArena;
export type NodeKind = import('./arena.js').NodeKind;
/**
 * Checks a finished arena: token spans, preorder shape, payload indexes and
 * token references. Reads the arena and throws at the first violation.
 * @param {SelectorArena} arena
 */
export declare function verifySelectorArena(arena: SelectorArena): void;
//# sourceMappingURL=arenaVerify.d.ts.map