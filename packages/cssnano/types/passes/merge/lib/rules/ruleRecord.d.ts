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
import type { BlockRecord, Slot } from './blockRecords.js';
/**
 * @param {ChildNode} node
 * @return {node is Declaration}
 */
export declare function isDeclaration(node: ChildNode): node is Declaration;
/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, its children, and where it stands. Every field is set up
 * front so all instances share one object layout.
 */
export declare class RuleRecord extends SelectorList {
    #private;
    /**
     * @param {Rule} node the rule the record describes
     * @param {string[]} selectors
     * @param {DeclarationRecord[]} declarations
     */
    constructor(node: Rule, selectors: string[], declarations: DeclarationRecord[]);
    /** @return {Slot | undefined} the slot the rule stands in, readable after departure */
    get slot(): Slot | undefined;
    /** @return {BlockRecord | null} the record of the children, when the rule holds a rule or an at-rule */
    get block(): BlockRecord | null;
    /** @param {Slot} slot the slot the rule now stands in */
    place(slot: Slot): void;
    /** @param {BlockRecord} block the record of the rule's children */
    setBlock(block: BlockRecord): void;
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
     * Appends a child to the node and to the records.
     *
     * @param {DeclarationRecord | ChildNode} child
     * @return {void}
     */
    append(child: DeclarationRecord | ChildNode): void;
    /**
     * The ids of the declarations, which a block holder keeps in its block.
     *
     * @return {RuleDeclarationKeys}
     */
    declarationKeys(): RuleDeclarationKeys;
    /**
     * Removes the declarations at `claimed` from the node and the records.
     *
     * @param {Set<number>} claimed the positions of the declarations that leave
     * @return {void}
     */
    removeDeclarationsAt(claimed: Set<number>): void;
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
     * Under consistency checks, throws when the declarations held differ from
     * those the rule holds now, in node or in the facts a record keeps, which an
     * edit that skipped its bookkeeping leaves.
     *
     * @throws {Error} when the declarations are stale
     */
    assertFresh(): void;
}
//# sourceMappingURL=ruleRecord.d.ts.map