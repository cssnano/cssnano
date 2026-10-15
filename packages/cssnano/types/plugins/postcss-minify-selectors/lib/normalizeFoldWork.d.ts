export type SelectorArena = import('./arena.js').SelectorArena;
export type Specificity = import('./arena.js').Specificity;
export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type Normalized = import('./normalizeOutput.js').Normalized;
export type Part = import('./normalizeOutput.js').Part;
export type FoldOccurrence = import('./normalizeFoldSupport.js').FoldOccurrence;
export type FoldGroup = import('./normalizeFoldSupport.js').FoldGroup;
export type FoldCandidate = import('./normalizeFoldSupport.js').FoldCandidate;
export type ActiveSelector = import('./normalizeFoldSupport.js').ActiveSelector;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} selectors @param {boolean} sort */
export declare function foldSelectors(arena: SelectorArena, pool: OutputPool, selectors: Normalized[], sort: boolean): import("./normalizeOutput.js").Normalized[];
//# sourceMappingURL=normalizeFoldWork.d.ts.map