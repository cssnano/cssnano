/**
 * The declaration stamp of each container of the arena. A stamp is a
 * non-negative integer that changes when a declaration joins or leaves the
 * chain of its container, so a cache built at one stamp is stale at another.
 */
export declare class DeclarationStamps {
    #private;
    /** Gives the next entry of the arena a stamp of 0. */
    grow(): void;
    /**
     * Gives the container a stamp greater than every earlier one.
     *
     * @param {number} container an index that the arena gave
     * @return {void}
     */
    touch(container: number): void;
    /**
     * @param {number} index an index that the arena gave
     * @return {number} the stamp of the entry at `index`
     */
    stampOf(index: number): number;
}
export type DeclarationStampReader = Pick<DeclarationStamps, 'stampOf'>;
/** @typedef {Pick<DeclarationStamps, 'stampOf'>} DeclarationStampReader */
//# sourceMappingURL=declarationStamps.d.ts.map