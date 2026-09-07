import cssnanoUtils from 'cssnano-utils';
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type Specificity = import('./arena.js').Specificity;
export type QualifiedNamePayload = import('./arena.js').QualifiedNamePayload;
export type Structure = NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>;
export type Builder = Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0];
export type ListWork = {
    kind: 'list';
    start: number;
    end: number;
    mode: ListMode;
    argumentPayload?: number;
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
    role: 'pseudo';
    status?: ParseStatus;
    facts?: import('./arena.js').SemanticFacts;
    specificity?: Specificity;
};
export type ParseWork = PseudoWork | ListWork | CloseWork;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./arena.js').QualifiedNamePayload} QualifiedNamePayload */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'close',node:number,role:'pseudo',status?:ParseStatus,facts?:import('./arena.js').SemanticFacts,specificity?:Specificity}} CloseWork */
/** @typedef {PseudoWork|ListWork|CloseWork} ParseWork */
/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
export declare function qualifiedNameAt(input: readonly import('./tokenUtils.js').CSSToken[], index: number, end: number): {
    invalidEnd: number;
    end?: undefined;
    payload?: undefined;
} | {
    invalidEnd?: undefined;
    end: number;
    payload: {
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
} | undefined;
/** @param {Builder} builder @param {Structure} structure @param {number} index */
export declare function addAttribute(builder: Builder, structure: Structure, index: number): number;
/** @param {Structure} structure @param {number} start */
export declare function pseudoDetails(structure: Structure, start: number): {
    nameIndex: number;
    nameToken: import("@csstools/css-tokenizer").CSSToken;
    isFunction: boolean;
    name: string;
    functionEnd: number | undefined;
    isElement: boolean;
    colonCount: 1 | 2;
};
/** @param {Builder} builder @param {Structure} structure @param {Extract<ParseWork,{kind:'pseudo'}>} item @param {unknown[]} work */
export declare function openPseudo(builder: Builder, structure: Structure, item: Extract<ParseWork, {
    kind: 'pseudo';
}>, work: unknown[]): void;
/** @param {Structure} structure @param {number} index @param {number} end */
export declare function pseudoEndAt(structure: Structure, index: number, end: number): number;
/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
//# sourceMappingURL=parseArenaPseudo.d.ts.map