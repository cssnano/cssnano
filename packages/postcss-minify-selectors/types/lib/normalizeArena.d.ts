export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Specificity = import('./arena.js').Specificity;
export type Emit = import('./outputOverlay.js').Emit;
export type Output = {
    emit?: Emit;
    id: number;
    length: number;
    text?: string;
    sourceNode?: number;
    changed?: boolean;
};
export type Normalized = Output & {
    node: number;
    parts?: Part[];
    foldEligible?: boolean;
    specificity?: Specificity;
    specificityId?: number;
    facts: number;
    entries?: Normalized[];
    valid: boolean;
    hasPseudoElement: boolean;
    trailing?: Output;
};
export type Part = Normalized | {
    kind: 'combinator';
    id: number;
    emit?: Emit;
    text: string;
    length: number;
};
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
/** @param {boolean} sort @param {FoldCandidate} left @param {FoldCandidate} right */
export declare function foldCandidateBefore(sort: boolean, left: FoldCandidate, right: FoldCandidate): boolean;
/**
 * Normalize immutable arena nodes once in iterative postorder.
 * @param {SelectorArena} arena
 * @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean,hasDefaultNamespace?:boolean}} [options]
 * @return {Emit | undefined}
 */
export declare function normalizeArena(arena: SelectorArena, options?: {
    sort?: boolean;
    convertToIs?: boolean;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
}): Emit | undefined;
//# sourceMappingURL=normalizeArena.d.ts.map