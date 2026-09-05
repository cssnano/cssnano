export type SelectorArena = import('./arena.js').SelectorArena;
export type Emit = import('./outputOverlay.js').Emit;
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/**
 * Build a source overlay without mutating the parsed arena. The legacy
 * normalizer remains the byte-parity oracle while transformation families are
 * moved behind this boundary.
 *
 * @param {SelectorArena} arena
 * @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean,hasDefaultNamespace?:boolean}} [options]
 * @return {Map<number, Emit>}
 */
export declare function normalizeArena(arena: SelectorArena, options?: {
    sort?: boolean;
    convertToIs?: boolean;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
}): Map<number, Emit>;
//# sourceMappingURL=normalizeArena.d.ts.map