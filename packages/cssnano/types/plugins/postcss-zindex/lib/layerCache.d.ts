/** @constructor */
declare class LayerCache {
    #private;
    constructor();
    /**
     * @param {number} startIndex
     * @return {void}
     */
    optimizeValues(startIndex: number): void;
    /**
     * @param {string} value
     * @return {void}
     */
    addValue(value: string): void;
    /**
     * @param {string} value
     * @return {string}
     */
    getValue(value: string): string;
}
export default LayerCache;
//# sourceMappingURL=layerCache.d.ts.map