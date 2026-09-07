import cssnanoUtils from 'cssnano-utils';
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type Structure = NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>;
export type QualifiedNamePayload = import('./arena.js').QualifiedNamePayload;
export type Builder = Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0];
export type RawWork = {
    kind: 'raw';
    start: number;
    end: number;
    status: ParseStatus;
};
export type ParseWork = {
    kind: 'attribute';
    start: number;
} | {
    kind: 'pseudo';
    start: number;
    end: number;
    mode: ListMode;
    insideHas: boolean;
} | {
    kind: 'class' | 'id' | 'nesting';
    start: number;
    end: number;
} | {
    kind: 'qualified-name';
    start: number;
    end: number;
    payload: QualifiedNamePayload;
} | RawWork;
/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode @param {boolean} insideHas */
export declare function compoundChildren(structure: Structure, start: number, end: number, mode: ListMode, insideHas: boolean, keyframe?: boolean): {
    status: import("./arena.js").ParseStatus;
    children: ParseWork[];
};
/** @param {Builder} builder @param {ParseWork} item @param {Structure} structure @param {unknown[]} work */
export declare function addLeafWork(builder: Builder, item: ParseWork, structure: Structure, work: unknown[]): void;
/** @param {string} source @param {ParseContext} [context] */
//# sourceMappingURL=parseArenaCompound.d.ts.map