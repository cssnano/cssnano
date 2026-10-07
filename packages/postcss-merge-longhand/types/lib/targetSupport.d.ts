/**
 * Whether every target supports all place-* shorthands. An engine without
 * them drops the whole declaration, losing both axes that separate longhands
 * would have kept.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {boolean}
 */
export declare function supportsPlaceShorthands(browsers: string[]): boolean;
/**
 * The oldest release of each engine that parses every longstanding unit and
 * function `isFallback` lists, by browserslist name. An engine left out, such
 * as Opera Mini, is assumed to reach it; its gaps are tracked as features.
 *
 * @type {Readonly<Record<string, string>>}
 */
export declare const longstandingFloor: Readonly<Record<string, string>>;
/**
 * The newer syntax every target parses, so an earlier declaration is no
 * fallback for it. Features without compatibility data are never included,
 * and longstanding syntax only when every target reaches the floor.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlySet<string>}
 */
export declare function featuresSupportedByAll(browsers: string[]): ReadonlySet<string>;
import type { BoxProperty } from './decl/boxGroups.js';
/**
 * What the targets support of the box groups. The newer shorthands arrived
 * long after their longhands, so which of two declarations applies in a
 * target depends on which of them it understands.
 */
export declare class BoxSupport {
    #private;
    /** @param {string[]} browsers */
    constructor(browsers: string[]);
    /**
     * @param {string} property
     * @return {boolean} whether every target understands the property
     */
    supportsAll(property: string): boolean;
    /**
     * @param {BoxProperty} earlier
     * @param {BoxProperty} later
     * @return {boolean} whether every target that may understand `earlier`
     * also understands `later`, so that `later` leaves nothing of `earlier`
     * showing
     */
    understandsWherever(earlier: BoxProperty, later: BoxProperty): boolean;
}
//# sourceMappingURL=targetSupport.d.ts.map