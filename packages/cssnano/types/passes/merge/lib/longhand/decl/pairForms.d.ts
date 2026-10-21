export type Parser = (value: string) => string | null;
export type PairFamily = {
    shorthand: string;
    longhands: string[];
    aliases: ReadonlySet<string>;
    parseValue: Parser[];
    emit: (values: string[]) => string | null;
    supportKey: string | null;
};
/** @type {PairFamily[]} */
export declare const pairFamilies: PairFamily[];
/**
 * Like the alignment families, prefixed and escaped spellings share the
 * cascade with the property they name, so they are seen and block a merge.
 *
 * @param {string} prop - lowercased property name
 * @return {PairFamily | undefined}
 */
export declare function pairFamilyOf(prop: string): PairFamily | undefined;
//# sourceMappingURL=pairForms.d.ts.map