import cssnanoUtils from 'cssnano-utils';
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type CompoundChild = {
    work: ParseWork;
    end: number;
    status?: ParseStatus;
    hasQualifiedName?: boolean;
};
export type Structure = NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>;
export type ParseWork = import('./parseArenaCore.js').ParseWork;
export type RawWork = import('./parseArenaCore.js').RawWork;
export type Builder = Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0];
/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode @param {boolean} insideHas */
export declare function compoundChildren(structure: Structure, start: number, end: number, mode: ListMode, insideHas: boolean, keyframe?: boolean): {
    status: import("./arena.js").ParseStatus;
    children: import("./parseArenaCore.js").ParseWork[];
};
/** @param {Builder} builder @param {ParseWork} item @param {Structure} structure @param {unknown[]} work */
export declare function addLeafWork(builder: Builder, item: ParseWork, structure: Structure, work: unknown[]): void;
/** @param {string} source @param {ParseContext} [context] */
//# sourceMappingURL=parseArenaCompound.d.ts.map