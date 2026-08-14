declare const _exports: {
    explode: typeof explode;
    merge: typeof merge;
    setsOtherColumnProperty: typeof setsOtherColumnProperty;
};
export = _exports;
/**
 * Check if a declaration sets column properties beyond `column-width` and
 * `column-count`. The `columns: <width> / <height>` form sets others (like
 * `column-height`), so we detect the slash. Only top-level slashes separate
 * components; ones in functions like `calc(100%/3)` do not.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean}
 */
declare function setsOtherColumnProperty(declaration: import('postcss').Declaration): boolean;
/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
declare function explode(rule: import('postcss').Rule): void;
/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
declare function merge(rule: import('postcss').Rule): void;
//# sourceMappingURL=columns.d.ts.map