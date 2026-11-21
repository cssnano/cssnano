import cssnanoUtils from '#utils';
import type { TokenEdit } from '../../../values/valueBuffer.js';
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
export type Ancestry = {
    /**
     * the nearest opening token around each token
     */
    parents: (number | undefined)[];
    /**
     * the nearest enclosing function token
     */
    functions: (number | undefined)[];
    /**
     * whether every enclosing token is a `(` group
     */
    plainGroups: boolean[];
};
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */
/**
 * The ancestors of each token, so a walk up the brackets is one lookup.
 *
 * @typedef {object} Ancestry
 * @property {(number|undefined)[]} parents the nearest opening token around each token
 * @property {(number|undefined)[]} functions the nearest enclosing function token
 * @property {boolean[]} plainGroups whether every enclosing token is a `(` group
 */
/**
 * @param {ReturnType<typeof cssnanoUtils.balancedTokens>} structure
 * @return {Ancestry}
 */
export declare function parentIndexes(structure: ReturnType<typeof cssnanoUtils.balancedTokens>): Ancestry;
/** @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {Ancestry} ancestry @param {TokenEdit[]} changes @return {void} */
export declare function minifyWhitespace(structure: Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>, ancestry: Ancestry, changes: TokenEdit[]): void;
/** @param {boolean} supports @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {Ancestry} ancestry @param {TokenEdit[]} changes @return {void} */
export declare function minifyAspectRatios(supports: boolean, structure: Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>, ancestry: Ancestry, changes: TokenEdit[]): void;
//# sourceMappingURL=whitespace.d.ts.map