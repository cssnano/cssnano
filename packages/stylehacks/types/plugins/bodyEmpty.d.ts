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
     * @return {(selectors: parser.Root) => void}
     */
    analyse(rule: import('postcss').Rule): (selectors: parser.Root) => void;
}
//# sourceMappingURL=bodyEmpty.d.ts.map