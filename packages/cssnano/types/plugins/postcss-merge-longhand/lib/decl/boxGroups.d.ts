export type BoxFamily = {
    group: BoxGroup;
    kind: 'physical' | 'flow';
    shorthand: string;
    /**
     * In slot order.
     */
    longhands: string[];
    /**
     * The side (`top`) or flow-relative suffix
     * (`block-start`) of each slot.
     */
    slotKeys: string[];
};
export type BoxGroup = {
    name: string;
    physical: BoxFamily;
    /**
     * The block axis, then the inline axis.
     */
    flow: BoxFamily[];
    /**
     * Every shorthand and longhand of the group.
     */
    properties: Set<string>;
    grammar: {
        auto: boolean;
        percentage: boolean;
        negative: boolean;
    };
};
export type BoxProperty = {
    name: string;
    /**
     * A dense number from zero, to key tables by pair.
     */
    index: number;
    family: BoxFamily;
    /**
     * The slot a longhand sets, or `-1` for the shorthand.
     */
    slot: number;
    /**
     * What the property sets: the physical side, as
     * `mode * 4 + side`, in each combination of writing mode and direction.
     */
    cells: number[];
};
/**
 * The five groups of box properties (margin, padding, inset, scroll-margin and
 * scroll-padding). Each has a physical shorthand over the four sides and two
 * axis shorthands over a flow-relative start and end. Within a group, physical
 * and flow-relative properties are aliases for the same computed values, and
 * which physical side a flow-relative one means depends on `writing-mode` and
 * `direction`, which a minifier cannot know.
 *
 * @typedef {object} BoxFamily A shorthand and the longhands it sets.
 * @property {BoxGroup} group
 * @property {'physical' | 'flow'} kind
 * @property {string} shorthand
 * @property {string[]} longhands In slot order.
 * @property {string[]} slotKeys The side (`top`) or flow-relative suffix
 * (`block-start`) of each slot.
 *
 * @typedef {object} BoxGroup
 * @property {string} name
 * @property {BoxFamily} physical
 * @property {BoxFamily[]} flow The block axis, then the inline axis.
 * @property {Set<string>} properties Every shorthand and longhand of the group.
 * @property {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 *
 * @typedef {object} BoxProperty
 * @property {string} name
 * @property {number} index A dense number from zero, to key tables by pair.
 * @property {BoxFamily} family
 * @property {number} slot The slot a longhand sets, or `-1` for the shorthand.
 * @property {number[]} cells What the property sets: the physical side, as
 * `mode * 4 + side`, in each combination of writing mode and direction.
 */
export declare const shorthandSlot = -1;
/**
 * The physical side each flow-relative suffix sets in each combination of
 * `writing-mode` and `direction`. Combinations that map every suffix alike,
 * such as `sideways-rl` and `vertical-rl`, set the same sides, so one stands
 * for them all.
 */
export declare const writingModes: {
    writingMode: string;
    direction: string;
    sides: {
        "block-start": string;
        "block-end": string;
        "inline-start": string;
        "inline-end": string;
    };
}[];
/** @type {BoxGroup[]} */
export declare const boxGroups: BoxGroup[];
/** @type {Map<string, BoxProperty>} */
export declare const boxProperties: Map<string, BoxProperty>;
/**
 * @param {string} prop - lowercased, and no member of any group
 * @return {BoxGroup | undefined}
 */
export declare function aliasedGroup(prop: string): BoxGroup | undefined;
//# sourceMappingURL=boxGroups.d.ts.map