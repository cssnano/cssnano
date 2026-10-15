import BasePlugin from '../plugin.js';
export default LeadingUnderscore;
declare class LeadingUnderscore extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {import('postcss').Declaration} decl
     * @return {void}
     */
    detect(decl: import('postcss').Declaration): void;
}
//# sourceMappingURL=leadingUnderscore.d.ts.map