import cssnanoUtils from '#utils';
/**
 * Restores the `+` of a source spelling that the new spelling lost. The
 * previous token is the one right before the number, so it touches it.
 *
 * @param {import('./convert.js').Spelling} spelling
 * @param {{raw: string}} source
 * @param {ReturnType<typeof cssnanoUtils.tokens>[number] | undefined} previous
 * @return {import('./convert.js').Spelling}
 */
export declare function keepJoiningSign(spelling: import('./convert.js').Spelling, source: {
    raw: string;
}, previous: ReturnType<typeof cssnanoUtils.tokens>[number] | undefined): import('./convert.js').Spelling;
//# sourceMappingURL=keepJoiningSign.d.ts.map