import BasePlugin from '../plugin.js';
export default BodyEmpty;
declare class BodyEmpty extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {import('postcss').Rule} rule
     * @return {void}
     */
    detect(rule: import('postcss').Rule): void;
}
//# sourceMappingURL=bodyEmpty.d.ts.map