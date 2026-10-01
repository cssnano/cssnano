/**
 * Whether every target supports all place-* shorthands. An engine without
 * them drops the whole declaration, losing both axes that separate longhands
 * would have kept, so a target without compatibility data counts as lacking
 * support.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {boolean}
 */
export declare function supportsPlaceShorthands(browsers: string[]): boolean;
//# sourceMappingURL=placeSupport.d.ts.map