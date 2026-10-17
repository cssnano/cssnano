export type Options = {
    /**
     * Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
     */
    counter?: boolean;
    /**
     * Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
     */
    counterStyle?: boolean;
    /**
     * Reduces `keyframes` rules and `animation` declarations. (default: true)
     */
    keyframes?: boolean;
    /**
     * Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
     */
    gridTemplate?: boolean;
    /**
     * Replaces a name. Receives the name and how many names came before it.
     */
    encoder?: (value: string, index: number) => string;
};
export type Reducer = {
    collect: (node: import('postcss').AnyNode) => void;
    transform: () => void;
};
/**
 * @typedef {object} Options
 * @property {boolean} [counter] Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
 * @property {boolean} [counterStyle] Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
 * @property {boolean} [keyframes] Reduces `keyframes` rules and `animation` declarations. (default: true)
 * @property {boolean} [gridTemplate] Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
 * @property {(value: string, index: number) => string} [encoder] Replaces a name. Receives the name and how many names came before it.
 */
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode) => void,
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