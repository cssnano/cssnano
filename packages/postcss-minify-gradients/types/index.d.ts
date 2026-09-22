export type SourceEdit = {
    start: number;
    end: number;
    text: string;
};
export type ColorStop = {
    /**
     * Comma-separated argument the stop came from.
     */
    argIndex: number;
    /**
     * Offset just past the colour in the declaration value.
     */
    colorEnd: number;
    /**
     * Positions following the colour.
     */
    position: readonly number[];
};
export type PositionValue = {
    number: number;
    unit: string;
};
/** @return {import('postcss').Plugin} */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
export { pluginCreator as default, pluginCreator as 'module.exports' };
//# sourceMappingURL=index.d.ts.map