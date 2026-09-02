import BasePlugin from '../plugin.js';
export default HtmlFirstChild;
declare class HtmlFirstChild extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {import('postcss').Rule} rule
     * @return {void}
     */
    detect(rule: import('postcss').Rule): void;
}
//# sourceMappingURL=htmlFirstChild.d.ts.map