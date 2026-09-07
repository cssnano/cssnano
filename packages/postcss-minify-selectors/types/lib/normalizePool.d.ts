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
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/** @typedef {{emit?:Emit,id:number,length:number,text?:string,sourceNode?:number,changed?:boolean}} Output */
export declare class OutputPool {
    arena: import("./arena.js").SelectorArena;
    /** @type {Map<string,Output>} */ texts: Map<string, Output>;
    /** @type {Map<string,Map<number,Map<number,number>>>} */
    identities: Map<string, Map<number, Map<number, number>>>;
    /** @type {Map<string,number>} */ payloads: Map<string, number>;
    /** @type {Map<number,Map<number,number>>} */ pairs: Map<number, Map<number, number>>;
    nextId: number;
    empty: Output;
    /** @param {SelectorArena} arena */
    constructor(arena: SelectorArena);
    /** @param {string} value @return {Output} */
    text(value: string): Output;
    /** @param {string} value */
    payload(value: string): number;
    /**
     * The structural ID is interned from normalized local text and ordered child
     * IDs as each output sequence is assembled. It therefore carries significant
     * raw bytes without retaining arena positions.
     * @param {string} kind
     * @param {number} payload
     * @param {number} structure
     */
    identity(kind: string, payload: number, structure: number): number;
    /** @param {number} left @param {number} right */
    pairId(left: number, right: number): number;
    /** @param {readonly number[]} values */
    sequenceId(values: readonly number[]): number;
    /** @param {Output} output @return {Emit} */
    emit(output: Output): Emit;
    /** @param {readonly Output[]} values @return {Output} */
    sequence(values: readonly Output[]): Output;
}
/** @param {SelectorArena} arena @param {number} tokenIndex */
export declare function offset(arena: SelectorArena, tokenIndex: number): number;
/** @param {SelectorArena} arena @param {number} start @param {number} end */
export declare function sourceText(arena: SelectorArena, start: number, end: number): string;
/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
export declare function compactIdent(token: import('./tokenUtils.js').CSSToken | undefined): string;
/** @param {SelectorArena} arena @param {ArenaNode} node @param {number} tokenIndex */
export declare function compactTerminalIdent(arena: SelectorArena, node: ArenaNode, tokenIndex: number): string;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export declare function importantTrivia(arena: SelectorArena, pool: OutputPool, start: number, end: number): Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export declare function trailingListTrivia(arena: SelectorArena, pool: OutputPool, start: number, end: number): Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export declare function leadingListTrivia(arena: SelectorArena, pool: OutputPool, start: number, end: number): Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export declare function descendantCombinator(arena: SelectorArena, pool: OutputPool, node: ArenaNode): Output;
/** @param {SelectorArena} arena @param {number} nodeIndex */
export declare function childrenOf(arena: SelectorArena, nodeIndex: number): number[];
/** @template {Output} T @param {(T | undefined)[]} normalized @param {number} nodeIndex @return {T} */
export declare function normalizedAt<T extends Output>(normalized: (T | undefined)[], nodeIndex: number): T;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export declare function rawOutput(arena: SelectorArena, pool: OutputPool, node: ArenaNode): Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {boolean} removable */
export declare function qualifiedNameOutput(arena: SelectorArena, pool: OutputPool, node: ArenaNode, removable: boolean): Output;
/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export declare function attributeOutput(arena: SelectorArena, pool: OutputPool, node: ArenaNode): Output;
/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
export declare function normalizeAnPlusB(input: readonly import('./tokenUtils.js').CSSToken[], start: number, end: number): {
    formula: {
        isTwoNPlusOne: boolean;
    };
    important: boolean;
    text: string;
} | undefined;
/** @param {Emit} root @param {SelectorArena | undefined} arena */
//# sourceMappingURL=normalizePool.d.ts.map