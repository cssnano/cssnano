import type { ValueBuffer } from '../../values/valueBuffer.js';
export type BalancedTokens = NonNullable<ReturnType<ValueBuffer['structure']>>;
export type FunctionFrame = {
    open: number;
    close: number;
    name: string;
    args: {
        significant: number[];
    }[];
    reduction?: [string, number];
};
export type ParsedArgument = {
    number: number;
    unit: string;
} | string | undefined;
/** @satisfies {import('../../pipeline/host.js').StageEntry} */
declare const reduceTransforms: {
    create: () => import("../../pipeline/host.js").Stage;
};
export { reduceTransforms as default };
//# sourceMappingURL=index.d.ts.map