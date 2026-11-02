import { SelectorList } from './selectorList.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { ChildNode } from 'postcss';
import type { Declaration, Rule } from 'postcss';
export type RuleDeclarationKeys = {
    keys: number[];
    keySet: Set<number>;
};
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { ElementKeyOf, SelectorLookup } from './selectorList.js';
import type { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { BlockRecords } from './blockRecords.js';
/**
 * @param {ChildNode} node
 * @return {node is Declaration}
 */
export declare function isDeclaration(node: ChildNode): node is Declaration;
/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, and its children. A nesting rule's children form a chain
 * in the arena of `BlockRecords`, so the record refers to no other record.
 * Every field is set up front so all instances share one object layout.
 */
export declare class RuleRecord extends SelectorList {
    #private;
    /**
     * The first entry of the chain of children, which a nesting rule links, or
     * -1 when it holds none. A plain rule keeps its children in its arrays.
     *
     * @type {number}
     */
    first: number;
    /** @type {number} the last entry of the chain of children, or -1 when it holds none */
    last: number;
    /** @type {number} the number of entries in the chain, kept by each link and unlink */
    count: number;
    /**
     * The id of the circumstances under which the rule applies its children, as
     * `containerContext` gives it. It is set once, at the build, for a rule that
     * holds a rule or an at-rule; -1 for any other rule.
     *
     * @type {number}
     */
    context: number;
    /** @type {number} the place of the record in the arena of its records, -1 until added */
    index: number;
    /**
     * @param {Rule} node the rule the record describes
     * @param {string[]} selectors
     * @param {DeclarationRecord[]} declarations
     */
    constructor(node: Rule, selectors: string[], declarations: DeclarationRecord[]);
    /** @return {boolean} whether a child was added or removed since the record was made */
    get edited(): boolean;
    /** @return {boolean} whether the rule has left the stylesheet; reading it does not throw */
    get departed(): boolean;
    /** @return {string[]} change it only through the methods of this class */
    get selectors(): string[];
    /** @return {DeclarationRecord[]} the declarations, without comments */
    get declarations(): DeclarationRecord[];
    /** @return {readonly (DeclarationRecord | ChildNode)[]} every child, comments included */
    get children(): readonly (DeclarationRecord | ChildNode)[];
    /** @return {number} the children, comments included */
    childCount(): number;
    /** @return {boolean} whether every child is a declaration, as an empty rule is */
    holdsOnlyDeclarations(): boolean;
    /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
    get pieces(): RangePiece[] | null | undefined;
    /** @param {RangePiece[] | null} pieces one per selector, or null */
    setPieces(pieces: RangePiece[] | null): void;
    /**
     * Appends a child to the records. The node takes it at write-back.
     *
     * @param {DeclarationRecord | ChildNode} child
     * @return {void}
     */
    append(child: DeclarationRecord | ChildNode): void;
    /**
     * The ids of the declarations, which a nesting rule keeps in its chain.
     *
     * @param {BlockRecords} records the arena that holds the rule's children
     * @return {RuleDeclarationKeys}
     */
    declarationKeys(records: BlockRecords): RuleDeclarationKeys;
    /**
     * Removes the declarations at `claimed` from the records. The node drops
     * them at write-back.
     *
     * @param {Set<number>} claimed the positions of the declarations that leave
     * @return {void}
     */
    removeDeclarationsAt(claimed: Set<number>): void;
    /**
     * Removes the declarations at `claimed` as `removeDeclarationsAt` does, and
     * hands over their records for another rule to append.
     *
     * @param {Set<number>} claimed the positions of the declarations that leave
     * @return {DeclarationRecord[]} the removed records, in order
     */
    takeDeclarationsAt(claimed: Set<number>): DeclarationRecord[];
    /**
     * @param {SelectorLookup} lookup
     * @return {VendorPrefixSummary}
     */
    vendorProfile(lookup: SelectorLookup): VendorPrefixSummary;
    /**
     * @param {SelectorLookup} lookup
     * @return {boolean} whether every selector is compatible with the target browsers
     */
    compatible(lookup: SelectorLookup): boolean;
    /**
     * @param {ElementKeyOf} [keyOf]
     * @return {string[] | null} see `SelectorList#elementKeys`
     */
    elementKeys(keyOf?: ElementKeyOf): string[] | null;
    /** @return {string} */
    selectorText(): string;
    /**
     * @param {RuleRecord} other
     * @return {boolean}
     */
    hasSameSelectors(other: RuleRecord): boolean;
    /**
     * @param {string[]} selectors appended to the rule's selector list
     * @param {SelectorLookup} lookup
     * @param {ElementKeyOf} [keyOf]
     * @param {RangePiece[] | null} [pieces]
     * @return {readonly string[] | null} see `SelectorList#add`
     */
    addSelectors(selectors: string[], lookup: SelectorLookup, keyOf?: ElementKeyOf, pieces?: RangePiece[] | null): readonly string[] | null;
    /**
     * Takes the place of a rule that is dropped and stood before this one.
     *
     * @param {RuleRecord} earlier left unusable
     * @param {SelectorLookup} lookup
     * @param {ElementKeyOf} [keyOf]
     */
    absorbEarlier(earlier: RuleRecord, lookup: SelectorLookup, keyOf?: ElementKeyOf): void;
    /** Marks the record of a rule that left the stylesheet, so a later read throws. */
    depart(): void;
    /**
     * Under consistency checks, throws when the children the node holds differ
     * from those the record holds, in node or in the facts a record keeps. Call
     * it once the node has taken the edits, at write-back.
     *
     * @throws {Error} when the declarations are stale
     */
    assertFresh(): void;
}
//# sourceMappingURL=ruleRecord.d.ts.map