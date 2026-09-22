export type SelectorArena = import('./arena.js').SelectorArena;
export type Emit = import('./outputOverlay.js').Emit;
export type WorkItem = {
    kind: 'emit';
    emit: Emit;
} | {
    kind: 'node';
    node: number;
} | {
    kind: 'source';
    start: number;
    end: number;
} | {
    kind: 'leave';
    node: number;
};
/** @param {SelectorArena} arena @param {ReadonlyMap<number,Emit>} rewrites @param {Emit} root */
export declare function serializeEmit(arena: SelectorArena, rewrites: ReadonlyMap<number, Emit>, root: Emit): string;
/**
 * Serialize trusted normalizer output. Node emissions always mean an unchanged
 * source-backed subtree, so this path needs no rewrite lookup or cycle guard.
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 */
export declare function serializeNormalized(arena: SelectorArena, root: Emit | undefined): string;
/** @param {SelectorArena} arena @param {ReadonlyMap<number,Emit>} rewrites */
export declare function serializeArena(arena: SelectorArena, rewrites: ReadonlyMap<number, Emit>): string;
//# sourceMappingURL=serializeArena.d.ts.map