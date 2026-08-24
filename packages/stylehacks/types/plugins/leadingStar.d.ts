import BasePlugin from '../plugin.js';
import type { Declaration, AtRule } from 'postcss';
export default LeadingStar;
declare class LeadingStar extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {Declaration | AtRule} node
     * @return {void}
     */
    detect(node: Declaration | AtRule): void;
}
//# sourceMappingURL=leadingStar.d.ts.map