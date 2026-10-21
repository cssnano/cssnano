/**
 * Resolves a property to the base name the table knows it by. A vendor
 * prefixed spelling resolves to the property it aliases; the unprefixed
 * spelling is tried first, since webref lists some prefixed names in their own
 * right.
 *
 * @param {string} name Property name key.
 * @return {{name: string, known: boolean}}
 */
export declare function resolveProperty(name: string): {
    name: string;
    known: boolean;
};
/**
 * The longhands a known property sets. A longhand sets only itself.
 *
 * @param {string} name
 * @return {string[]}
 */
export declare function longhandsOf(name: string): string[];
/**
 * The logical property group a longhand belongs to, and whether it is
 * flow-relative, or undefined when it is in no group.
 *
 * @param {string} longhand
 * @return {{group: string, flowRelative: boolean} | undefined}
 */
export declare function logicalSideOf(longhand: string): {
    group: string;
    flowRelative: boolean;
} | undefined;
export type PropertyKeys = {
    custom: true;
    key: string;
} | {
    custom: false;
    all: true;
} | {
    custom: false;
    all: false;
    name: string;
    known: boolean;
    subjectToAll: boolean;
    longhands: {
        name: string;
        side: string | undefined;
        opposite: string | undefined;
    }[];
    lead: string;
    length: number;
    bare: string;
};
/**
 * The keys of each property name a conflict query has seen during one run of
 * the pass. A table belongs to the merge state of one stylesheet, so a name
 * seen in one stylesheet is not kept for the next. Custom properties are left
 * out: their keys are trivial and their names unbounded.
 */
export declare class PropertyTable {
    #private;
    /**
     * @param {string} prop
     * @return {PropertyKeys}
     */
    keysOf(prop: string): PropertyKeys;
}
//# sourceMappingURL=propertyTable.d.ts.map