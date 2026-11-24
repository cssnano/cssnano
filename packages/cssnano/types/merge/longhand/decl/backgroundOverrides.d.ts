import type { BlockDeclarations } from '../blockDeclarations.js';
export type LaneState = Map<string, string>;
/**
 * Drops a later `background-*` longhand that repeats what the nearest
 * `background` shorthand of the same importance already set. Every other
 * `background` declaration, prefixed or not, resets what it may affect.
 *
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export declare function discardRedundantBackgroundLonghands(list: BlockDeclarations, features: ReadonlySet<string>): void;
//# sourceMappingURL=backgroundOverrides.d.ts.map