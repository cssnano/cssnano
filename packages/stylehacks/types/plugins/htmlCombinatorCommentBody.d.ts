import BasePlugin from '../plugin.js';
export default HtmlCombinatorCommentBody;
declare class HtmlCombinatorCommentBody extends BasePlugin {
    /** @param {import('postcss').Result} result */
    constructor(result: import('postcss').Result);
    /**
     * @param {import('postcss').Rule} rule
     * @return {void}
     */
    detect(rule: import('postcss').Rule): void;
    /** @param {import('postcss').Rule} rule
     *  @return {(selectors: parser.Root) => void}
     */
    analyse(rule: import('postcss').Rule): (selectors: parser.Root) => void;
}
//# sourceMappingURL=htmlCombinatorCommentBody.d.ts.map