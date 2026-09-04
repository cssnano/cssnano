/** @typedef {[number, number, number]} Specificity */
export type Specificity = [number, number, number];
export type HasSpecificity = {
    specificity: Specificity;
};
/**
 * @typedef {{
 *   specificity: Specificity,
 * }} HasSpecificity
 */
/**
 * @param {Specificity} target
 * @param {Specificity} value
 */
export declare function addSpecificity(target: Specificity, value: Specificity): void;
/**
 * @param {{ specificity?: Specificity }[]} entries
 * @return {Specificity}
 */
export declare function maximumSpecificity(entries: {
    specificity?: Specificity;
}[]): Specificity;
/**
 * @param {{ specificity: Specificity }} c
 * @return {string}
 */
export declare function compoundSpecificityKey(c: {
    specificity: Specificity;
}): string;
//# sourceMappingURL=specificity.d.ts.map