/**
 * @param {string} prop
 * @return {string}
 */
declare function vendorUnprefixed(prop: string): string;
/**
 * Resolves a property to the name the generated data knows it by: vendor
 * prefixed spellings collapse onto the property they alias, and a prefix we
 * have no data for is dropped, since moving `-webkit-background-clip` past a
 * `background` shorthand is as unsafe as moving the unprefixed property. Webref
 * lists some prefixed spellings, like `-webkit-user-select`, as properties in
 * their own right with no alias back to the unprefixed one, so the unprefixed
 * spelling is always tried first, not just when the prefixed one is unknown.
 *
 * @param {string} name Lowercased property name.
 * @return {{name: string, known: boolean}}
 */
declare function resolveProperty(name: string): {
    name: string;
    known: boolean;
};
/**
 * The longhands a property sets. A longhand sets only itself.
 *
 * @param {string} name
 * @return {string[]}
 */
declare function longhandsOf(name: string): string[];
/**
 * The logical property group a longhand belongs to, and which side of it the
 * longhand is on: flow-relative or physical.
 *
 * @param {string} longhand
 * @return {{group: string, flowRelative: boolean} | undefined}
 */
declare function logicalSideOf(longhand: string): {
    group: string;
    flowRelative: boolean;
} | undefined;
/**
 * True if declarations of `propA` and `propB` can set the same underlying
 * property, so that reordering them within a rule can change what the rule
 * computes to. The relation is symmetric: a shorthand setting a longhand and a
 * longhand overriding part of a shorthand are the same conflict seen from
 * either end.
 *
 * @param {string} propA
 * @param {string} propB
 * @return {boolean}
 */
declare function isConflictingProp(propA: string, propB: string): boolean;
export { isConflictingProp, resolveProperty, longhandsOf, logicalSideOf, vendorUnprefixed, };
//# sourceMappingURL=propertyRelations.d.ts.map