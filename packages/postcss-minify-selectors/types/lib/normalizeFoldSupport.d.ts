export type SelectorArena = import('./arena.js').SelectorArena;
export type Specificity = import('./arena.js').Specificity;
export type Normalized = import('./normalizeOutput.js').Normalized;
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @param {{pairs:Map<number,Map<number,number>>,next:number}} state @param {number} left @param {number} right */
export declare function consId(state: {
    pairs: Map<number, Map<number, number>>;
    next: number;
}, left: number, right: number): number;
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
/** @param {Normalized} selector @param {SelectorArena} arena */
export declare function selectorCanFold(selector: Normalized, arena: SelectorArena): boolean;
/** @param {Map<number,Map<number,Map<number,FoldGroup>>>} groups @param {{value:number}} sequence @param {number} prefix @param {number} suffix @param {Normalized} middle */
export declare function foldGroup(groups: Map<number, Map<number, Map<number, FoldGroup>>>, sequence: {
    value: number;
}, prefix: number, suffix: number, middle: Normalized): FoldGroup;
/** @param {FoldGroup} group */
export declare function activeOccurrences(group: FoldGroup): FoldOccurrence[];
/** @param {FoldOccurrence[]} values @param {FoldOccurrence} value @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
export declare function pushOccurrence(values: FoldOccurrence[], value: FoldOccurrence, before: (left: FoldOccurrence, right: FoldOccurrence) => boolean): void;
/** @param {FoldOccurrence} left @param {FoldOccurrence} right */
export declare function occurrenceOrder(left: FoldOccurrence, right: FoldOccurrence): boolean;
/** @param {FoldOccurrence} left @param {FoldOccurrence} right */
export declare function occurrenceText(left: FoldOccurrence, right: FoldOccurrence): boolean;
/** @param {FoldGroup} group @return {FoldCandidate | undefined} */
export declare function foldCandidate(group: FoldGroup): FoldCandidate | undefined;
export declare class CandidateHeap {
    /** @type {FoldCandidate[]} */ values: FoldCandidate[];
    sort: boolean;
    /** @param {boolean} sort */
    constructor(sort: boolean);
    /** @param {FoldCandidate} left @param {FoldCandidate} right */
    before(left: FoldCandidate, right: FoldCandidate): boolean;
    /** @param {FoldCandidate} value */
    push(value: FoldCandidate): void;
    pop(): FoldCandidate;
}
/** @param {boolean} sort @param {FoldCandidate} left @param {FoldCandidate} right */
export declare function foldCandidateBefore(sort: boolean, left: FoldCandidate, right: FoldCandidate): boolean;
/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
//# sourceMappingURL=normalizeFoldSupport.d.ts.map