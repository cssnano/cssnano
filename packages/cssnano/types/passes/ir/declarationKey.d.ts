export type DeclarationFields = {
    prop: string;
    value: string;
    important?: boolean;
    raws: {
        before?: string;
    };
};
export type AtRuleFields = {
    name: string;
    params: string;
    raws: {
        before?: string;
        afterName?: string;
    };
};
export type Trie = Map<unknown, unknown>;
/**
 * Nested maps keyed by the components of a structural description. Each
 * component is one step, so equal descriptions reach the same leaf without
 * concatenating strings.
 * @typedef {Map<unknown, unknown>} Trie
 */
/**
 * @param {Trie} trie
 * @param {unknown} key
 * @return {Trie}
 */
export declare function step(trie: Trie, key: unknown): Trie;
/**
 * The browser hack in front of a declaration, such as `*` or `_`. The parser
 * keeps it in `raws.before`, not in the property name, so it is part of the
 * declaration's identity. A stray `;` before the declaration is not a hack,
 * and a declaration without `raws.before` has none.
 *
 * @param {DeclarationFields} declaration
 * @return {string}
 */
export declare function hackPrefixOf(declaration: DeclarationFields): string;
/**
 * Numbers the declarations and other structural descriptions of one run of the
 * pass. Equal descriptions get equal integers, so callers compare ids rather
 * than trees. Nothing may keep an id across runs.
 */
export declare class DeclarationKeys {
    #private;
    /** @type {Trie} */
    root: Trie;
    /**
     * The key of a declaration: the same property, value, importance and hack
     * prefix. Names fold ASCII case, except custom properties, which are
     * case-sensitive.
     *
     * @param {DeclarationFields} declaration
     * @return {number}
     */
    keyOf(declaration: DeclarationFields): number;
    /**
     * The id of an at-rule's prelude: its name, its params and its trimmed
     * `raws.before` and `raws.afterName`. Ids of the preludes are kept with
     * their paths, for `preludeTrie`.
     *
     * @param {AtRuleFields} node
     * @return {number}
     */
    preludeId(node: AtRuleFields): number;
    /**
     * The path that a prelude id ends, from `preludeId`, which a structural id
     * extends.
     *
     * @param {number} id
     * @return {Trie}
     */
    preludeTrie(id: number): Trie;
    /**
     * The id of the path that ends at `trie`, assigned on first use.
     *
     * @param {Trie} trie
     * @return {number}
     */
    leafOf(trie: Trie): number;
}
//# sourceMappingURL=declarationKey.d.ts.map