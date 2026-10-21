import type { Declaration } from 'postcss';
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
 * declaration's identity. A declaration without `raws.before` has no hack.
 *
 * @param {Declaration} declaration
 * @return {string}
 */
export declare function hackPrefixOf(declaration: Declaration): string;
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
     * @param {Declaration} declaration
     * @return {number}
     */
    keyOf(declaration: Declaration): number;
    /**
     * The id of the path that ends at `trie`, assigned on first use.
     *
     * @param {Trie} trie
     * @return {number}
     */
    leafOf(trie: Trie): number;
}
//# sourceMappingURL=declarationKey.d.ts.map