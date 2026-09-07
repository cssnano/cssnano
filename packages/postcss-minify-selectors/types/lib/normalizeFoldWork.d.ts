export type SelectorArena = import('./arena.js').SelectorArena;
export type Specificity = import('./arena.js').Specificity;
export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type Normalized = import('./normalizeOutput.js').Normalized;
export type Part = import('./normalizeOutput.js').Part;
export type FoldOccurrence = {
    selector: ActiveSelector;
    position: number;
    middle: Normalized;
    group: FoldGroup;
    text: string;
};
export type FoldGroup = {
    occurrences: FoldOccurrence[];
    orderHeap: FoldOccurrence[];
    lexHeap: FoldOccurrence[];
    middleCounts: Map<number, {
        count: number;
        middle: Normalized;
    }>;
    specificity: Specificity;
    specificityId: number;
    activeCount: number;
    selectorLength: number;
    middleLength: number;
    version: number;
    sequence: number;
};
export type FoldCandidate = {
    group: FoldGroup;
    version: number;
    savings: number;
    count: number;
    first: FoldOccurrence;
    lex: string;
};
export type ActiveSelector = Normalized & {
    active: boolean;
    activeId: number;
    order: number;
    memberships: FoldOccurrence[];
    previousId?: number;
    nextId?: number;
};
/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} selectors @param {boolean} sort */
export declare function foldSelectors(arena: SelectorArena, pool: OutputPool, selectors: Normalized[], sort: boolean): import("./normalizeOutput.js").Normalized[];
//# sourceMappingURL=normalizeFoldWork.d.ts.map