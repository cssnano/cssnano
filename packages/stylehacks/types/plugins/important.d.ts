import BasePlugin from '../plugin.js';
export default Important;
declare class Important extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {import('postcss').Declaration} decl
     * @return {void}
     */
    detect(decl: import('postcss').Declaration): void;
}
//# sourceMappingURL=important.d.ts.map