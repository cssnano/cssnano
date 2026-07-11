export = CommentRemover;
declare class CommentRemover {
    options: import("../index.js").Options;
    _hasFirst: boolean | undefined;
    /** @param {import('../index.js').Options} options */
    constructor(options: import('../index.js').Options);
    /**
     * @param {string} comment
     * @return {boolean | undefined}
     */
    canRemove(comment: string): boolean | undefined;
}
//# sourceMappingURL=commentRemover.d.ts.map