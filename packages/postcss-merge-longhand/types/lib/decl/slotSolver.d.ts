import type { Container, Declaration } from 'postcss';
import type { BoxFamily } from './boxGroups.js';
/** @import {Container, Declaration} from 'postcss'; */
/** @import {BoxFamily} from './boxGroups.js'; */
/**
 * A substitution function such as `var()` or `env()` may stand for any number
 * of tokens, so a shorthand that holds one cannot be split into its slots.
 * `hasSubstitution` also rejects a custom property, so `canExplode` skips it.
 *
 * @param {Declaration} declaration - a shorthand
 * @return {boolean}
 */
export declare function isExplodable(declaration: Declaration): boolean;
/**
 * @param {BoxFamily} family
 * @return {{ parse: (value: string) => string[], minify: (value: string | string[]) => string }}
 * how the family spreads and condenses its slots: four sides, or a start and
 * an end
 */
export declare function formsOf(family: BoxFamily): {
    parse: (value: string) => string[];
    minify: (value: string | string[]) => string;
};
/**
 * The values to put in the slots a later declaration overrides, so that the
 * shorthand comes out as short as it can. Only the values of the other slots
 * are candidates: they are valid for the group and add no requirement the
 * shorthand did not have. Ties go to the earliest assignment found, trying
 * the opposite slot's value first, so equal inputs give equal outputs.
 *
 * @param {string[]} values - one per slot
 * @param {boolean[]} free - whether a later declaration overrides the slot
 * @param {(value: string[]) => string} minify
 * @return {string | undefined} the shortest value, if shorter than the
 * original
 */
export declare function shortestWithFreeSlots(values: string[], free: boolean[], minify: (value: string[]) => string): string | undefined;
/**
 * Folds the declarations of one family in one importance lane into the
 * shorthand, then frees the values later declarations override.
 *
 * Folding moves a value to the position of the shorthand, so it stops at any
 * declaration that may set the same physical side: one of the other kind
 * (physical or flow-relative) in the group, or one the plugin does not
 * understand. The other axis of a flow-relative family never does. Creating
 * or growing a shorthand also needs every target to support it.
 *
 * @param {Container} rule
 * @param {BoxFamily} family
 * @param {Declaration[]} laneDecls - the group's declarations of one
 * importance, in source order
 * @param {boolean} important
 * @param {boolean} mayInsert - whether every target supports the shorthand
 * @return {void}
 */
export declare function reduceFamilyLane(rule: Container, family: BoxFamily, laneDecls: Declaration[], important: boolean, mayInsert: boolean): void;
//# sourceMappingURL=slotSolver.d.ts.map