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
 * @param {Options} arg
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator({ counter, counterStyle, keyframes, gridTemplate, encoder, }?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map