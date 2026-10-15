import type { CSSToken } from '@csstools/css-tokenizer';
export type SourceEdit = {
    start: number;
    end: number;
    text: string;
};
export type PositionValue = {
    number: number;
    unit: string;
};
/**
 * A zero in the position's own dimension and a zero percentage name the same
 * gradient position, which is also what the unitless zero this plugin emits
 * denotes. Conic positions are angles and the other gradients' are lengths; a
 * zero of the other dimension is invalid there, so it must not be rewritten
 * into a valid one.
 *
 * @param {string} unit
 * @param {boolean} conic Whether the positions are `<angle-percentage>`.
 * @return {boolean}
 */
export declare function isPositionZeroUnit(unit: string, conic: boolean): boolean;
/**
 * Colour stop fixup raises a position to the largest position before it, so a
 * position at or below that non-negative maximum can be written as a zero.
 *
 * @param {readonly CSSToken[]} input
 * @param {readonly number[]} position Offsets of the position tokens.
 * @param {PositionValue | undefined} maximum Running maximum of the preceding positions.
 * @param {Map<number, SourceEdit>} edits Collects the positions reduced to a zero.
 * @param {boolean} conic
 * @return {PositionValue | undefined} The maximum the following stops clamp to.
 */
export declare function zeroPositionEdits(input: readonly CSSToken[], position: readonly number[], maximum: PositionValue | undefined, edits: Map<number, SourceEdit>, conic: boolean): PositionValue | undefined;
//# sourceMappingURL=positions.d.ts.map