/** Separates path segments in a layer key; no decoded `<ident>` contains it. */
export declare const SEPARATOR = "\0";
/**
 * Parses `<layer-name>#` per CSS Cascade 5. Browsers ignore a statement
 * with any invalid name, so those return `undefined` and declare nothing,
 * as does an empty prelude, which names no layer.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} prelude the
 *   tokens of the prelude
 * @return {string[] | undefined}
 */
export declare function parseLayerNames(prelude: readonly import('@csstools/css-tokenizer').CSSToken[]): string[] | undefined;
/**
 * @param {string} parent key of the enclosing layer, '' outside layers
 * @param {string} name never empty: an `<ident>` has at least one code point
 * @return {string}
 */
export declare function joinKey(parent: string, name: string): string;
//# sourceMappingURL=layerNames.d.ts.map