import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { TokenLists } from '../../../passes/ir/tokenLists.js';
declare class LayerRegistry {
    records: BlockRecords;
    tokenLists: TokenLists;
    nextIndex: number;
    /** @type {Map<string, { index: number, children: LayerRegistry }>} */
    layers: Map<string, {
        index: number;
        children: LayerRegistry;
    }>;
    /** @type {Map<ArenaIndex, { index: number, children: LayerRegistry }>} */
    entries: Map<ArenaIndex, {
        index: number;
        children: LayerRegistry;
    }>;
    /**
     * @param {BlockRecords} records the stylesheet the layers are in
     * @param {TokenLists} tokenLists the run's token lists, which the preludes name
     */
    constructor(records: BlockRecords, tokenLists: TokenLists);
    /**
     * @param {string} name
     * @return {{ index: number, children: LayerRegistry }}
     */
    getOrCreate(name: string): {
        index: number;
        children: LayerRegistry;
    };
    /**
     * The entry at a segment path, creating the missing segments.
     *
     * @param {string[]} segments
     * @return {{ index: number, children: LayerRegistry }}
     */
    entryAt(segments: string[]): {
        index: number;
        children: LayerRegistry;
    };
    /**
     * The registry entry a single layer at-rule occupies, creating missing
     * segments as needed. Statement lists and unparseable names fall back to a
     * unique entry, so they order but never match another spelling; names nested
     * inside still order beneath it through the child registry. A rule keeps one
     * entry, so its name is read once however many definitions it holds.
     *
     * @param {ArenaIndex} layerRule
     * @return {{ index: number, children: LayerRegistry }}
     */
    entryFor(layerRule: ArenaIndex): {
        index: number;
        children: LayerRegistry;
    };
    /**
     * Registers the layers a @layer at-rule declares, in document order and
     * nested beneath any enclosing layers, so later lookups observe the real
     * layer tree.
     *
     * @param {ArenaIndex} layerRule
     * @return {void}
     */
    declareLayerAtRule(layerRule: ArenaIndex): void;
    /**
     * @param {ArenaIndex} index
     * @return {number[]}
     */
    getPriority(index: ArenaIndex): number[];
}
/**
 * @param {{ layerPriority: number[], documentIndex: number }} a
 * @param {{ layerPriority: number[], documentIndex: number }} b
 * @return {number}
 */
declare function compareAtRulePriority(a: {
    layerPriority: number[];
    documentIndex: number;
}, b: {
    layerPriority: number[];
    documentIndex: number;
}): number;
/**
 * Whether the stylesheet imports another. An imported stylesheet can declare
 * layers before this one does, so the layer order is not known from this
 * stylesheet alone. An import rule is valid only before every rule except
 * `@charset` and layer statements.
 *
 * @param {BlockRecords} records
 * @return {boolean}
 */
declare function hasImport(records: BlockRecords): boolean;
export { LayerRegistry, compareAtRulePriority, hasImport };
//# sourceMappingURL=layerRegistry.d.ts.map