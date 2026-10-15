declare class LayerRegistry {
    nextIndex: number;
    /** @type {Map<string, { index: number, children: LayerRegistry }>} */
    layers: Map<string, {
        index: number;
        children: LayerRegistry;
    }>;
    /** @type {Map<import('postcss').AtRule, { index: number, children: LayerRegistry }>} */
    anonymous: Map<import('postcss').AtRule, {
        index: number;
        children: LayerRegistry;
    }>;
    constructor();
    /**
     * @param {string} name
     * @return {{ index: number, children: LayerRegistry }}
     */
    getOrCreate(name: string): {
        index: number;
        children: LayerRegistry;
    };
    /**
     * Entry for a layer with no name or an unparseable name: every occurrence
     * is a unique cascade layer, but names nested inside still order beneath
     * it through the child registry.
     *
     * @param {import('postcss').AtRule} layerRule
     * @return {{ index: number, children: LayerRegistry }}
     */
    getOrCreateAnonymous(layerRule: import('postcss').AtRule): {
        index: number;
        children: LayerRegistry;
    };
    /**
     * The registry entry a single layer at-rule occupies, creating missing
     * segments as needed. Statement lists and unparseable names fall back to a
     * unique anonymous entry so they order but never match another spelling.
     *
     * @param {import('postcss').AtRule} layerRule
     * @return {{ index: number, children: LayerRegistry }}
     */
    entryFor(layerRule: import('postcss').AtRule): {
        index: number;
        children: LayerRegistry;
    };
    /**
     * Registers the layers a @layer at-rule declares, in document order and
     * nested beneath any enclosing layers, so later lookups observe the real
     * layer tree.
     *
     * @param {import('postcss').AtRule} layerRule
     * @return {void}
     */
    declareLayerAtRule(layerRule: import('postcss').AtRule): void;
    /**
     * @param {import('postcss').Node} node
     * @return {number[]}
     */
    getPriority(node: import('postcss').Node): number[];
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
export { LayerRegistry, compareAtRulePriority };
//# sourceMappingURL=layerRegistry.d.ts.map