export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Specificity = import('./arena.js').Specificity;
export type Emit = import('./outputOverlay.js').Emit;
export type Output = {
    emit: Emit;
    id: number;
    length: number;
    text?: string;
    sourceNode?: number;
    sourceArena?: SelectorArena;
};
export type Normalized = Output & {
    node: number;
    parts?: Part[];
    foldEligible?: boolean;
    specificity?: Specificity;
    entries?: Normalized[];
    valid?: boolean;
    hasPseudoElement?: boolean;
};
export type Part = Normalized | {
    kind: 'combinator';
    id: number;
    emit: Emit;
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
    order: number;
    memberships: FoldOccurrence[];
    previous?: ActiveSelector;
    next?: ActiveSelector;
};
/**
 * Normalize immutable arena nodes once in iterative postorder.
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