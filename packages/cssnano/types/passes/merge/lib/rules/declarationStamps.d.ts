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
    /**
     * @param {number} index an index that the arena gave
     * @return {boolean} whether the declarations of the container changed after the build settled them
     */
    isTouched(index: number): boolean;
    /** Marks every touch so far as the build's, so that only later touches count. */
    settle(): void;
}
export type DeclarationStampReader = Pick<DeclarationStamps, 'stampOf' | 'isTouched'>;
/** @typedef {Pick<DeclarationStamps, 'stampOf' | 'isTouched'>} DeclarationStampReader */
//# sourceMappingURL=declarationStamps.d.ts.map