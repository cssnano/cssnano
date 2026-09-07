export { foldCandidateBefore } from './normalizeFoldSupport.js';
/** @param {import('./arena.js').SelectorArena} arena @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean,hasDefaultNamespace?:boolean}} [options] */
export declare function normalizeArena(arena: import('./arena.js').SelectorArena, options?: {
    sort?: boolean;
    convertToIs?: boolean;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
}): import("./outputOverlay.js").Emit | undefined;
//# sourceMappingURL=normalizeArena.d.ts.map