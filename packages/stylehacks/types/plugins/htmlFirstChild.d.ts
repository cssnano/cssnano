import BasePlugin from '../plugin.js';
export default HtmlFirstChild;
declare class HtmlFirstChild extends BasePlugin {
    /** @param {import('postcss').Result} result */
    constructor(result: import('postcss').Result);
    /**
     * @param {import('postcss').Rule} rule
     * @return {void}
     */
    detect(rule: import('postcss').Rule): void;
    /**
     * @param {import('postcss').Rule} rule
     * @return {(selectors: parser.Root) => void}
     */
    analyse(rule: import('postcss').Rule): (selectors: parser.Root) => void;
}
//# sourceMappingURL=htmlFirstChild.d.ts.map