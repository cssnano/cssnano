import BasePlugin from '../plugin.js';
export default TrailingSlashComma;
declare class TrailingSlashComma extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {import('postcss').Rule} rule
     * @return {void}
     */
    detect(rule: import('postcss').Rule): void;
}
//# sourceMappingURL=trailingSlashComma.d.ts.map