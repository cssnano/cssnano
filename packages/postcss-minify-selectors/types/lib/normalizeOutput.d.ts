export type Output = import('./normalizePool.js').Output;
export type OutputPool = import('./normalizePool.js').OutputPool;
export type Emit = import('./outputOverlay.js').Emit;
export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
export type Specificity = import('./arena.js').Specificity;
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
    emit?: import('./outputOverlay.js').Emit;
    text: string;
    length: number;
};
/** @param {OutputPool} pool @param {Output} output */
export declare function outputText(pool: OutputPool, output: Output): string;
/** @param {number} nodeIndex @param {Output} output */
export declare function sourceNodeOutput(nodeIndex: number, output: Output): {
    id: number;
    length: number;
    emit: undefined;
    sourceNode: number;
    text: undefined;
    changed: boolean;
};
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
export declare function unchangedNodeOutput(arena: SelectorArena, pool: OutputPool, nodeIndex: number, normalized: (Normalized | undefined)[], children: readonly number[]): {
    id: number;
    length: number;
    sourceNode: number;
    changed: boolean;
} | undefined;
/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children @param {Output} output */
export declare function canReuseSourceNode(arena: SelectorArena, nodeIndex: number, normalized: (Normalized | undefined)[], children: readonly number[], output: Output): boolean;
/** @param {SelectorArena} arena @param {ArenaNode} node @param {OutputPool} pool @param {Output} output */
export declare function normalizedPayload(arena: SelectorArena, node: ArenaNode, pool: OutputPool, output: Output): number;
//# sourceMappingURL=normalizeOutput.d.ts.map