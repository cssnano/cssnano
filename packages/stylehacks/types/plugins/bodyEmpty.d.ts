import parser from 'postcss-selector-parser';
import BasePlugin from '../plugin.js';
export default BodyEmpty;
declare class BodyEmpty extends BasePlugin {
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
//# sourceMappingURL=bodyEmpty.d.ts.map