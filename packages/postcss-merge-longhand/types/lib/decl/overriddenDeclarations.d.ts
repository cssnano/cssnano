import type { ChildNode, Container, Declaration } from 'postcss';
export type Survivors = Declaration | Declaration[];
/** @typedef {Declaration | Declaration[]} Survivors */
export declare const candidateLimit = 16;
export type CrossPropertyRule = {
    /**
     * whether a later declaration of another property always wins over the earlier
     */
    overrides: (earlier: Declaration, later: Declaration) => boolean;
    /**
     * the
     * lowercased properties a declaration sets; with it, only later declarations
     * whose footprint holds a property the earlier one sets are compared
     */
    footprint?: (node: Declaration) => Iterable<string>;
};
/**
 * @param {Container} container - a style rule
 * @return {void}
 */
export declare function discardOverriddenDeclarations(container: Container): void;
/**
 * @param {ChildNode[]} nodes - declarations in source order, such as one
 * importance lane of a family; `all` declarations and nested rules bound runs
 * @param {ReadonlySet<string>} [trustedProperties] - lowercased names the
 * caller validated, whose duplicates need no matching shape
 * @param {CrossPropertyRule} [crossPropertyRule] - the family's precedence
 * between different properties, such as a shorthand over its longhands
 * @return {void}
 */
export declare function discardOverriddenInList(nodes: ChildNode[], trustedProperties?: ReadonlySet<string>, crossPropertyRule?: CrossPropertyRule): void;
/**
 * @param {Declaration[][]} lanes - the normal and important lanes of a family
 * @param {ReadonlySet<string>} [trustedProperties] - forwarded
 * @param {CrossPropertyRule} [crossPropertyRule] - forwarded
 * @return {void}
 */
export declare function discardOverriddenInLanes(lanes: Declaration[][], trustedProperties?: ReadonlySet<string>, crossPropertyRule?: CrossPropertyRule): void;
//# sourceMappingURL=overriddenDeclarations.d.ts.map