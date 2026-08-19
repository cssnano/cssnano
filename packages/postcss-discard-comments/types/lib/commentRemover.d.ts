export = CommentRemover;
declare class CommentRemover {
    #private;
    options: import("../index.js").Options;
    /** @param {import('../index.js').Options} options */
    constructor(options: import('../index.js').Options);
    /**
     * @param {string} comment
     * @return {boolean | undefined}
     */
    canRemove(comment: string): boolean | undefined;
}
//# sourceMappingURL=commentRemover.d.ts.map