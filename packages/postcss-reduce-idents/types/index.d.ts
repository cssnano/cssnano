export = pluginCreator;
export type Options = {
    counter?: boolean;
    counterStyle?: boolean;
    keyframes?: boolean;
    gridTemplate?: boolean;
    encoder?: (value: string, index: number) => string;
};
export type Reducer = {
    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void;
    transform: () => void;
};
/** @typedef {{
    counter?: boolean, counterStyle?: boolean,
    keyframes?: boolean, gridTemplate?: boolean,
    encoder?: (value: string, index: number) => string}} Options
*/
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void,
 *    transform: () => void
 *  }} Reducer
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} arg
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator({ counter, counterStyle, keyframes, gridTemplate, encoder, }?: {
    counter?: boolean | undefined;
    counterStyle?: boolean | undefined;
    encoder?: ((val: string, num: number) => string) | undefined;
    gridTemplate?: boolean | undefined;
    keyframes?: boolean | undefined;
}): {
    postcssPlugin: string;
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css: import('postcss').Root): void;
};
//# sourceMappingURL=index.d.ts.map