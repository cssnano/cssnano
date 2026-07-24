export = LeadingStar;
declare class LeadingStar extends BasePlugin {
    /** @param {import('postcss').Result=} result */
    constructor(result?: import('postcss').Result | undefined);
    /**
     * @param {Declaration | AtRule} node
     * @return {void}
     */
    detect(node: Declaration | AtRule): void;
}
import BasePlugin = require('../plugin');
import type { Declaration, AtRule } from 'postcss';
//# sourceMappingURL=leadingStar.d.ts.map