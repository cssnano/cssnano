export type FunctionFrame = {
    open: number;
    close: number;
    name: string;
    args: {
        significant: number[];
    }[];
};
export type ParsedArgument = {
    number: number;
    unit: string;
} | string | undefined;
/** @type {import('../../pipeline/host.js').StageDescriptor} */
declare const reduceTransforms: import('../../pipeline/host.js').StageDescriptor;
export { reduceTransforms as default };
//# sourceMappingURL=index.d.ts.map