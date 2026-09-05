/**
 * @typedef {'list' | 'complex' | 'compound' | 'combinator' | 'qualified-name' | 'class' | 'id' | 'attribute' | 'pseudo' | 'nesting' | 'raw'} NodeKind
 * @typedef {'valid' | 'invalid' | 'opaque'} ParseStatus
 * @typedef {'outer-unforgiving' | 'forgiving' | 'unforgiving' | 'relative' | 'compound-only'} ListMode
 * @typedef {readonly [number, number, number]} Specificity
 * @typedef {{status:'valid',specificity:Specificity}|{status:'opaque'}} SpecificityResult
 * @typedef {{hasNamespace:boolean,hasPseudoElement:boolean,hasVendorPseudo:boolean,hasNesting:boolean,hasAttributeModifier:boolean,hasCommentDescendant:boolean,hasNestedHas:boolean,hasFunction:boolean,hasUnsafePseudo:boolean}} SemanticFacts
 * @typedef {{kind:NodeKind,startToken:number,endToken:number,subtreeEnd:number,status:ParseStatus,specificity?:Specificity,facts?:Readonly<SemanticFacts>,payload:number}} ArenaNode
 * @typedef {{mode:ListMode,keyframe?:boolean,hasDefaultNamespace?:boolean}} ListPayload
 * @typedef {{value:string}} CombinatorPayload
 * @typedef {{namespace:{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number},subject:{kind:'universal',token:number}|{kind:'type',token:number}}} QualifiedNamePayload
 * @typedef {{name:string,nameToken:number,colonCount:1|2,pseudoKind:'class'|'element'|'unknown',argumentGrammar?:string,specificityPolicy:string,argumentNode?:number}} PseudoPayload
 * @typedef {{namespace:{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number},nameToken:number,matcher?:string,valueToken?:number,modifierToken?:number,caseBehavior:'default'|'ascii-insensitive'|'case-sensitive'}} AttributePayload
 * @typedef {{text:string}} RawPayload
 * @typedef {{lists:readonly Readonly<ListPayload>[],combinators:readonly Readonly<CombinatorPayload>[],qualifiedNames:readonly Readonly<QualifiedNamePayload>[],pseudos:readonly Readonly<PseudoPayload>[],attributes:readonly Readonly<AttributePayload>[],raw:readonly Readonly<RawPayload>[]}} PayloadTables
 * @typedef {import('./tokenUtils.js').CSSToken} CSSToken
 */
export type NodeKind = 'list' | 'complex' | 'compound' | 'combinator' | 'qualified-name' | 'class' | 'id' | 'attribute' | 'pseudo' | 'nesting' | 'raw';
export type ParseStatus = 'valid' | 'invalid' | 'opaque';
export type ListMode = 'outer-unforgiving' | 'forgiving' | 'unforgiving' | 'relative' | 'compound-only';
export type Specificity = readonly [number, number, number];
export type SpecificityResult = {
    status: 'valid';
    specificity: Specificity;
} | {
    status: 'opaque';
};
export type SemanticFacts = {
    hasNamespace: boolean;
    hasPseudoElement: boolean;
    hasVendorPseudo: boolean;
    hasNesting: boolean;
    hasAttributeModifier: boolean;
    hasCommentDescendant: boolean;
    hasNestedHas: boolean;
    hasFunction: boolean;
    hasUnsafePseudo: boolean;
};
export type ArenaNode = {
    kind: NodeKind;
    startToken: number;
    endToken: number;
    subtreeEnd: number;
    status: ParseStatus;
    specificity?: Specificity;
    facts?: Readonly<SemanticFacts>;
    payload: number;
};
export type ListPayload = {
    mode: ListMode;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
};
export type CombinatorPayload = {
    value: string;
};
export type QualifiedNamePayload = {
    namespace: {
        kind: 'absent';
    } | {
        kind: 'empty';
    } | {
        kind: 'wildcard';
    } | {
        kind: 'named';
        token: number;
    };
    subject: {
        kind: 'universal';
        token: number;
    } | {
        kind: 'type';
        token: number;
    };
};
export type PseudoPayload = {
    name: string;
    nameToken: number;
    colonCount: 1 | 2;
    pseudoKind: 'class' | 'element' | 'unknown';
    argumentGrammar?: string;
    specificityPolicy: string;
    argumentNode?: number;
};
export type AttributePayload = {
    namespace: {
        kind: 'absent';
    } | {
        kind: 'empty';
    } | {
        kind: 'wildcard';
    } | {
        kind: 'named';
        token: number;
    };
    nameToken: number;
    matcher?: string;
    valueToken?: number;
    modifierToken?: number;
    caseBehavior: 'default' | 'ascii-insensitive' | 'case-sensitive';
};
export type RawPayload = {
    text: string;
};
export type PayloadTables = {
    lists: readonly Readonly<ListPayload>[];
    combinators: readonly Readonly<CombinatorPayload>[];
    qualifiedNames: readonly Readonly<QualifiedNamePayload>[];
    pseudos: readonly Readonly<PseudoPayload>[];
    attributes: readonly Readonly<AttributePayload>[];
    raw: readonly Readonly<RawPayload>[];
};
export type CSSToken = import('./tokenUtils.js').CSSToken;
/** @return {SemanticFacts} */
export declare function createSemanticFacts(): SemanticFacts;
/** @param {ArenaNode} compound @return {boolean} */
export declare function isFoldEligible(compound: ArenaNode): boolean;
/** @return {Specificity} */
export declare function zeroSpecificity(): Specificity;
/** @param {Specificity} a @param {Specificity} b @return {SpecificityResult} */
export declare function addSpecificity(a: Specificity, b: Specificity): SpecificityResult;
declare class SelectorArenaBuilder {
    #private;
    source: string;
    tokens: readonly import("@csstools/css-tokenizer").CSSToken[];
    structure: unknown;
    /** @type {ArenaNode[]} */ nodes: ArenaNode[];
    /** @type {number[]} */ frames: number[];
    /** @type {number[]} */ lastChildren: number[];
    /** @type {number[]} */ roots: number[];
    /** @type {{lists:ListPayload[],combinators:CombinatorPayload[],qualifiedNames:QualifiedNamePayload[],pseudos:PseudoPayload[],attributes:AttributePayload[],raw:RawPayload[]}} */
    payloads: {
        lists: ListPayload[];
        combinators: CombinatorPayload[];
        qualifiedNames: QualifiedNamePayload[];
        pseudos: PseudoPayload[];
        attributes: AttributePayload[];
        raw: RawPayload[];
    };
    /** @param {string} source @param {readonly CSSToken[]} tokens @param {unknown} [structure] */
    constructor(source: string, tokens: readonly CSSToken[], structure?: unknown);
    /** @param {NodeKind} kind @param {number} startToken @param {number} endToken @param {{status?:ParseStatus,payload?:number,specificity?:Specificity,facts?:SemanticFacts}} [options] */
    open(kind: NodeKind, startToken: number, endToken: number, options?: {
        status?: ParseStatus;
        payload?: number;
        specificity?: Specificity;
        facts?: SemanticFacts;
    }): number;
    /** @param {number} nodeIndex */
    close(nodeIndex: number): void;
    /**
     * @param {number} nodeIndex
     * @param {{status?:ParseStatus,specificity?:Specificity,facts?:SemanticFacts}} [summary]
     */
    closeSummary(nodeIndex: number, summary?: {
        status?: ParseStatus;
        specificity?: Specificity;
        facts?: SemanticFacts;
    }): void;
    /** @param {NodeKind} kind @param {number} startToken @param {number} endToken @param {{status?:ParseStatus,payload?:number,specificity?:Specificity,facts?:SemanticFacts}} [options] */
    leaf(kind: NodeKind, startToken: number, endToken: number, options?: {
        status?: ParseStatus;
        payload?: number;
        specificity?: Specificity;
        facts?: SemanticFacts;
    }): number;
    /** @param {keyof SelectorArenaBuilder['payloads']} table @param {object} payload */
    payload(table: keyof SelectorArenaBuilder['payloads'], payload: object): number;
    finish(): SelectorArena;
}
export declare class SelectorArena {
    source: string;
    tokens: readonly import("@csstools/css-tokenizer").CSSToken[];
    nodes: readonly Readonly<ArenaNode>[];
    payloads: PayloadTables;
    structure: unknown;
    /** @param {string} source @param {readonly CSSToken[]} tokens @param {readonly Readonly<ArenaNode>[]} nodes @param {PayloadTables} payloads @param {unknown} [structure] */
    constructor(source: string, tokens: readonly CSSToken[], nodes: readonly Readonly<ArenaNode>[], payloads: PayloadTables, structure?: unknown);
    /** @param {number} nodeIndex @param {(childIndex:number)=>void} callback */
    forEachChild(nodeIndex: number, callback: (childIndex: number) => void): void;
}
/** @param {string} source @param {readonly CSSToken[]} tokens @param {(builder:SelectorArenaBuilder)=>void} build @param {unknown} [structure] @return {SelectorArena} */
export declare function buildSelectorArena(source: string, tokens: readonly CSSToken[], build: (builder: SelectorArenaBuilder) => void, structure?: unknown): SelectorArena;
export {};
//# sourceMappingURL=arena.d.ts.map