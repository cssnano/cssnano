/**
 * @param {string} value
 * @param {(value: string, index: number) => string} encoder
 * @param {Map<string, {ident: string, count: number}>} cache
 */
declare const addToCache: (value: string, encoder: (value: string, index: number) => string, cache: Map<string, {
    ident: string;
    count: number;
}>) => void;
export default addToCache;
//# sourceMappingURL=cache.d.ts.map