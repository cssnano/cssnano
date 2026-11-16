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
export type PropertyKeys = Readonly<{
    id: number;
    custom: true;
    key: string;
} | {
    id: number;
    custom: false;
    all: true;
} | {
    id: number;
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
}>;
/**
 * The property names of one run, each numbered by first use. Two spellings
 * that fold to one name share its keys and id. Nothing may keep an id across
 * runs.
 */
export declare class PropertyNames {
    #private;
    /**
     * The keys of a property name, built on its first use in the run.
     *
     * @param {string} prop
     * @return {PropertyKeys}
     */
    keysOf(prop: string): PropertyKeys;
}
//# sourceMappingURL=propertyTable.d.ts.map