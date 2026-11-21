import type { BlockDeclarations, DeclarationItem } from '../blockDeclarations.js';
export type Survivors = number | number[];
/** @typedef {number | number[]} Survivors positions in the list */
export declare const candidateLimit = 16;
export type CrossPropertyRule = {
    /**
     * whether a later declaration of another property always wins over the earlier
     */
    overrides: (earlier: DeclarationItem, later: DeclarationItem, features: ReadonlySet<string>) => boolean;
    /**
     * the
     * lowercased properties a declaration sets; with it, only later declarations
     * whose footprint holds a property the earlier one sets are compared
     */
    footprint?: (node: DeclarationItem) => Iterable<string>;
};
/**
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export declare function discardOverriddenDeclarations(list: BlockDeclarations, features: ReadonlySet<string>): void;
/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} positions - declarations in source order, such as
 * one importance lane of a family; `all` declarations, nested rules and values
 * kept as written bound runs, so `RUN_END` marks a run end in a chain
 * @param {ReadonlySet<string>} features the features every target supports
 * @param {ReadonlySet<string>} [trustedProperties] - lowercased names the
 * caller validated, whose duplicates need no matching shape
 * @param {CrossPropertyRule} [crossPropertyRule] - the family's precedence
 * between different properties, such as a shorthand over its longhands
 * @return {void}
 */
export declare function discardOverriddenInList(list: BlockDeclarations, positions: readonly number[], features: ReadonlySet<string>, trustedProperties?: ReadonlySet<string>, crossPropertyRule?: CrossPropertyRule): void;
/**
 * @param {BlockDeclarations} list
 * @param {readonly (readonly number[])[]} lanes - the normal and important lanes of a family
 * @param {ReadonlySet<string>} features - forwarded
 * @param {ReadonlySet<string>} [trustedProperties] - forwarded
 * @param {CrossPropertyRule} [crossPropertyRule] - forwarded
 * @return {void}
 */
export declare function discardOverriddenInLanes(list: BlockDeclarations, lanes: readonly (readonly number[])[], features: ReadonlySet<string>, trustedProperties?: ReadonlySet<string>, crossPropertyRule?: CrossPropertyRule): void;
//# sourceMappingURL=overriddenDeclarations.d.ts.map