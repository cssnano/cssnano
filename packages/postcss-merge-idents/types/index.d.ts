import { TokenType } from '@csstools/css-tokenizer';
export type AtRuleEntry = {
    rule: import('postcss').AtRule;
    body?: string;
    layerPriority: number[];
    documentIndex: number;
    parsed: {
        isString: boolean;
        isReservedName: boolean;
        key: string;
        tokenText: string;
    };
};
export type FamilyRecord = {
    entries: AtRuleEntry[];
    resolver?: (key: string) => {
        text: string;
        key: string;
    } | undefined;
    definedNames?: Set<string>;
};
export type NestingFrame = {
    expectedArgs?: number[];
    argIndex: number;
    close: TokenType;
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