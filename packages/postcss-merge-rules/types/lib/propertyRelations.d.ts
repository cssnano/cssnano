declare const _exports: {
    isConflictingProp: typeof isConflictingProp;
};
export = _exports;
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
//# sourceMappingURL=propertyRelations.d.ts.map