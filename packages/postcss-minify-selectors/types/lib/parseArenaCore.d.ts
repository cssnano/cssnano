import cssnanoUtils from 'cssnano-utils';
/** @type {typeof cssnanoUtils.balancedTokens} */
declare const balancedTokens: typeof cssnanoUtils.balancedTokens;
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type SemanticFacts = import('./arena.js').SemanticFacts;
export type Structure = NonNullable<ReturnType<typeof balancedTokens>>;
export type ParseContext = {
    mode?: ListMode;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
    verifyArena?: boolean;
};
export type ListWork = {
    kind: 'list';
    start: number;
    end: number;
    mode: ListMode;
    argumentPayload?: number;
    insideHas: boolean;
};
export type ComplexWork = {
    kind: 'complex';
    start: number;
    end: number;
    mode: ListMode;
    status?: ParseStatus;
    insideHas: boolean;
};
export type CompoundWork = {
    kind: 'compound';
    start: number;
    end: number;
    mode: ListMode;
    insideHas: boolean;
};
export type CombinatorWork = {
    kind: 'combinator';
    start: number;
    end: number;
    value: string;
};
export type AttributeWork = {
    kind: 'attribute';
    start: number;
};
export type NamedSimpleWork = {
    kind: 'class' | 'id' | 'nesting';
    start: number;
    end: number;
};
export type QualifiedNameWork = {
    kind: 'qualified-name';
    start: number;
    end: number;
    payload: import('./arena.js').QualifiedNamePayload;
};
export type RawWork = {
    kind: 'raw';
    start: number;
    end: number;
    status: ParseStatus;
};
export type PseudoWork = {
    kind: 'pseudo';
    start: number;
    end: number;
    mode: ListMode;
    insideHas: boolean;
};
export type CloseWork = {
    kind: 'close';
    node: number;
    role: 'list' | 'complex' | 'compound' | 'pseudo';
    mode?: ListMode;
    status?: ParseStatus;
    facts?: SemanticFacts;
};
export type ParseWork = ListWork | ComplexWork | CompoundWork | CombinatorWork | AttributeWork | NamedSimpleWork | QualifiedNameWork | RawWork | PseudoWork | CloseWork;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').SemanticFacts} SemanticFacts */
/** @typedef {NonNullable<ReturnType<typeof balancedTokens>>} Structure */
/** @typedef {{mode?:ListMode,keyframe?:boolean,hasDefaultNamespace?:boolean,verifyArena?:boolean}} ParseContext */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'complex',start:number,end:number,mode:ListMode,status?:ParseStatus,insideHas:boolean}} ComplexWork */
/** @typedef {{kind:'compound',start:number,end:number,mode:ListMode,insideHas:boolean}} CompoundWork */
/** @typedef {{kind:'combinator',start:number,end:number,value:string}} CombinatorWork */
/** @typedef {{kind:'attribute',start:number}} AttributeWork */
/** @typedef {{kind:'class'|'id'|'nesting',start:number,end:number}} NamedSimpleWork */
/** @typedef {{kind:'qualified-name',start:number,end:number,payload:import('./arena.js').QualifiedNamePayload}} QualifiedNameWork */
/** @typedef {{kind:'raw',start:number,end:number,status:ParseStatus}} RawWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'close',node:number,role:'list'|'complex'|'compound'|'pseudo',mode?:ListMode,status?:ParseStatus,facts?:SemanticFacts}} CloseWork */
/** @typedef {ListWork|ComplexWork|CompoundWork|CombinatorWork|AttributeWork|NamedSimpleWork|QualifiedNameWork|RawWork|PseudoWork|CloseWork} ParseWork */
/** @param {string} source @param {ParseContext} [context] */
export declare function parseSelectorArena(source: string, context?: ParseContext): import("./arena.js").SelectorArena;
export {};
//# sourceMappingURL=parseArenaCore.d.ts.map