declare const _exports: {
    explode: typeof explode;
    merge: typeof merge;
    setsOtherColumnProperty: typeof setsOtherColumnProperty;
};
export = _exports;
/**
 * The shorthand sets more than the two components this pair of transforms puts
 * back together — `column-height` as of css-multicol-2 — so a stylesheet that
 * sets one of those could tell a `columns` declaration apart from the longhands
 * it expands to. Both spellings count: the property itself, and the
 * `columns: <width> / <height>` form of the shorthand.
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