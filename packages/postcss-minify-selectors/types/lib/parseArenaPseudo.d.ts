import cssnanoUtils from 'cssnano-utils';
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type Specificity = import('./arena.js').Specificity;
export type ParseWork = import('./parseArenaCore.js').ParseWork;
export type Structure = NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>;
export type Builder = Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0];
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