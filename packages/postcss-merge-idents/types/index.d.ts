export type Group = Array<{
    name: string;
    copies: AtRuleEntry[];
}>;
export type AtRuleEntry = {
    rule: import('postcss').AtRule;
    body?: string;
    layerPriority: number[];
    documentIndex: number;
    family: string;
    containerId: number;
    parsed: {
        isString: boolean;
        isReservedName: boolean;
        key: string;
        tokenText: string;
    };
};
/**
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map