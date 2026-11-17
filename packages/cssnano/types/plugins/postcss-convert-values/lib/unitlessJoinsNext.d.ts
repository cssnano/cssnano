import cssnanoUtils from '#utils';
export type Spelling = import('./convert.js').Spelling;
export type CSSToken = ReturnType<typeof cssnanoUtils.tokens>[number];
/**
 * Whether the new spelling is a bare number and the next token touches it,
 * so the two would read back as one token or another value, e.g. `0px.5px`
 * as `0.5px`, `1.0.5` as `1.5`, `0%top` as the dimension `0top`, `50%%` as
 * `.5%`.
 *
 * @param {Spelling} spelling
 * @param {CSSToken | undefined} next
 * @return {boolean}
 */
export declare function unitlessJoinsNext(spelling: Spelling, next: CSSToken | undefined): boolean;
//# sourceMappingURL=unitlessJoinsNext.d.ts.map