export type Parser = (decl: import('../blockDeclarations.js').DeclarationItem) => string | null;
export type PairFamily = {
    shorthand: string;
    longhands: string[];
    aliases: ReadonlySet<string>;
    parseValue: Parser[];
    emit: (values: string[]) => string | null;
    requires?: (values: string[]) => string[];
    supportKey: string | null;
};
/** @type {PairFamily[]} */
export declare const pairFamilies: PairFamily[];
/**
 * Like the alignment families, prefixed and escaped spellings share the
 * cascade with the property they name, so they are seen and block a merge.
 *
 * @param {string} prop - lowercased property name
 * @return {readonly PairFamily[]} every family the property shares the
 *   cascade with: a physical border property is in all four logical sides
 */
export declare function pairFamiliesOf(prop: string): readonly PairFamily[];
//# sourceMappingURL=pairForms.d.ts.map