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
/** @return {import('postcss').Plugin} */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map