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
 * The keys of one property name: what a conflict query reads for it.
 *
 * @param {string} prop
 * @return {PropertyKeys}
 */
export declare function keysOfName(prop: string): PropertyKeys;
//# sourceMappingURL=propertyTable.d.ts.map