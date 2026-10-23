import cssnanoUtils from '#utils';
/**
 * @param {{start: number, end: number, text: string}} edit
 * @param {{start: number, raw: string}} source
 * @param {ReturnType<typeof cssnanoUtils.tokens>[number] | undefined} previous
 * @return {{start: number, end: number, text: string}}
 */
export declare function keepJoiningSign(edit: {
    start: number;
    end: number;
    text: string;
}, source: {
    start: number;
    raw: string;
}, previous: ReturnType<typeof cssnanoUtils.tokens>[number] | undefined): {
    start: number;
    end: number;
    text: string;
};
//# sourceMappingURL=keepJoiningSign.d.ts.map