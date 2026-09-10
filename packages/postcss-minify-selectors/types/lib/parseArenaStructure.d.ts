import cssnanoUtils from 'cssnano-utils';
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type SemanticFacts = import('./arena.js').SemanticFacts;
export type Specificity = import('./arena.js').Specificity;
export type Builder = Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0];
export type Structure = NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>;
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
    specificity?: Specificity;
};
export type ParseWork = ListWork | ComplexWork | CompoundWork | PseudoWork | CloseWork;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').SemanticFacts} SemanticFacts */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'complex',start:number,end:number,mode:ListMode,status?:ParseStatus,insideHas:boolean}} ComplexWork */
/** @typedef {{kind:'compound',start:number,end:number,mode:ListMode,insideHas:boolean}} CompoundWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'close',node:number,role:'list'|'complex'|'compound'|'pseudo',mode?:ListMode,status?:ParseStatus,facts?:SemanticFacts,specificity?:Specificity}} CloseWork */
/** @typedef {ListWork|ComplexWork|CompoundWork|PseudoWork|CloseWork} ParseWork */
/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
export declare function isTrivia(token: import('./tokenUtils.js').CSSToken | undefined): token is import("@csstools/css-tokenizer").TokenComment | import("@csstools/css-tokenizer").TokenWhitespace;
/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
export declare function hasContent(input: readonly import('./tokenUtils.js').CSSToken[], start: number, end: number): boolean;
/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode */
export declare function complexParts(structure: Structure, start: number, end: number, mode: ListMode): {
    parts: {
        kind: 'compound' | 'combinator';
        start: number;
        end: number;
        value?: string;
    }[];
    status: import("./arena.js").ParseStatus;
    commentDescendant: boolean;
};
/** @param {ParseStatus} current @param {ParseStatus} child */
export declare function mergeStatus(current: ParseStatus, child: ParseStatus): "invalid" | "opaque" | "valid";
/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
export declare function isIdentifierContinuationToken(token: import('./tokenUtils.js').CSSToken | undefined): boolean;
/** @param {Builder} builder @param {Extract<ParseWork,{kind:'close'}>} item */
export declare function closeWork(builder: Builder, item: Extract<ParseWork, {
    kind: 'close';
}>): void;
/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
//# sourceMappingURL=parseArenaStructure.d.ts.map