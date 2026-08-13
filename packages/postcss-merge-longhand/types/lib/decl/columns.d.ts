declare const _exports: {
    explode: typeof explode;
    merge: typeof merge;
    setsColumnHeight: typeof setsColumnHeight;
};
export = _exports;
/**
 * A `columns` declaration also sets `column-height`, which has no place in the
 * two component value this pair of transforms builds, so a stylesheet that sets
 * the property could tell a shorthand apart from the longhands it expands to.
 * Both spellings count: the property itself, and the `columns: <width> /
 * <height>` form of the shorthand.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean}
 */
declare function setsColumnHeight(declaration: import('postcss').Declaration): boolean;
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