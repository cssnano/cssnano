import cssnanoUtils from 'cssnano-utils';
export type ParseStatus = import('./arena.js').ParseStatus;
export type QualifiedNamePayload = import('./arena.js').QualifiedNamePayload;
export type Structure = NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>;
export type Builder = Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0];
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').QualifiedNamePayload} QualifiedNamePayload */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */
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
//# sourceMappingURL=parseArenaAttribute.d.ts.map