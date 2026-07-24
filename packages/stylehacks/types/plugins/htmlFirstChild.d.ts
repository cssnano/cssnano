export = HtmlFirstChild;
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
     * @return {parser.SyncProcessor<void>}
     */
    analyse(rule: import('postcss').Rule): parser.SyncProcessor<void>;
}
import parser = require('postcss-selector-parser');
import BasePlugin = require('../plugin');
//# sourceMappingURL=htmlFirstChild.d.ts.map