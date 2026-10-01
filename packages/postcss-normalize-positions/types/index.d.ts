import type { CSSToken } from '@csstools/css-tokenizer';
export type BalancedIndex = {
    tokens: readonly CSSToken[];
    endForOpening(index: number): number | undefined;
};
export type Side = {
    axis: 'x' | 'y' | 'center';
    offset: string;
};
export type PositionTerm = {
    start: number;
    end: number;
    side: Side | undefined;
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