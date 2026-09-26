import type { Container, Declaration } from 'postcss';
/**
 * Byte cost of one emitted declaration: the property and value text, the `:`
 * separator and terminating `;`, and the `!important` annotation.
 *
 * @param {string} prop
 * @param {string} value
 * @param {boolean} [important]
 * @return {number}
 */
export declare function declCost(prop: string, value: string, important?: boolean): number;
/**
 * The slot-lane reducers (border-radius, columns, margin/padding) all keep a
 * vector of `{ value, decl }` slots, a set of contributing declarations and a
 * set of declarations preserved as fallbacks. This module carries the parts of
 * that bookkeeping that are identical across the families: slot assignment
 * with fallback registration, the reset predicate, the support-provenance
 * check, and the commit step that rewrites or emits the merged shorthand.
 *
 * Family-specific judgment stays with each reducer: how a value is parsed and
 * minified, which values are CSS-wide keywords, and which properties a
 * shorthand names.
 */
/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @return {{ value: string, decl: Declaration }[] | null} the fully-filled
 * vector, or `null` while any slot is empty or holds a custom property
 */
export declare function slotVectorReady(slots: ({
    value: string;
    decl: Declaration;
} | null)[]): {
    value: string;
    decl: Declaration;
}[] | null;
/**
 * A merged shorthand must not outlive the support requirements of any
 * declaration it represents: when one slot's support provenance differs from
 * the first, the values are not interchangeable.
 *
 * @param {{ value: string, decl: Declaration }[]} full
 * @return {boolean}
 */
export declare function supportProvenanceMatches(full: {
    value: string;
    decl: Declaration;
}[]): boolean;
/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx
 * @param {string} value
 * @param {Declaration} decl
 * @param {Set<Declaration>} fallbacks
 */
export declare function assignSlotValue(slots: ({
    value: string;
    decl: Declaration;
} | null)[], idx: number, value: string, decl: Declaration, fallbacks: Set<Declaration>): void;
/**
 * A new declaration flushes the vector when it would overwrite a slot whose
 * declaration a later declaration may need as a fallback, or when a CSS-wide
 * keyword resets every slot it touches.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx - the slot the declaration writes, or -1 for a shorthand
 * @param {Declaration} decl
 * @return {boolean}
 */
export declare function shouldResetSlots(slots: ({
    value: string;
    decl: Declaration;
} | null)[], idx: number, decl: Declaration): boolean;
/**
 * Commits a fully-filled slot vector when its shorthand wins the byte-cost
 * comparison: a lone same-property declaration is rewritten in place, and a
 * profitable cover is inserted after the final represented declaration while
 * the represented, non-fallback declarations are removed.
 *
 * @param {Container} rule
 * @param {{ value: string, decl: Declaration }[]} full
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {{ prop: string, value: string, important: boolean, inserted?: Map<Declaration, Declaration> }} target
 */
export declare function commitShorthand(rule: Container, full: {
    value: string;
    decl: Declaration;
}[], contributing: Set<Declaration>, fallbacks: Set<Declaration>, target: {
    prop: string;
    value: string;
    important: boolean;
    inserted?: Map<Declaration, Declaration>;
}): void;
//# sourceMappingURL=slotVector.d.ts.map