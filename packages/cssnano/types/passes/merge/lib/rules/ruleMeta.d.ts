import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { Declaration, Rule } from 'postcss';
export type RuleDeclarationKeys = {
    keys: number[];
    keySet: Set<number>;
};
export type RuleElementKeys = {
    /**
     * the distinct keys, in order of first appearance
     */
    list: string[];
    /**
     * the same keys, for membership tests
     */
    seen: Set<string>;
};
export type SelectorLookup = (selector: string, rule?: import('postcss').Rule, index?: number) => import('./ensureCompatibility.js').SelectorInfo;
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { BlockRecord, Slot } from './blockRecords.js';
/**
 * @param {import('postcss').ChildNode} node
 * @return {node is Declaration}
 */
export declare function isDeclaration(node: import('postcss').ChildNode): node is Declaration;
/**
 * The selector list of a rule with what is derived from it. Every field is
 * set up front so all instances share one object layout.
 */
export declare class RuleMeta {
    #private;
    /**
     * @param {string[]} selectors
     * @param {Declaration[]} declarations
     */
    constructor(selectors: string[], declarations: Declaration[]);
    /**
     * The slot the rule stands in. It stays readable after the rule departs, so
     * an edit can still find where the rule stood.
     *
     * @return {Slot | undefined}
     */
    get slot(): Slot | undefined;
    /**
     * The record of the rule's children, or null when it holds no rule or
     * at-rule. Readable after departure, as `slot` is.
     *
     * @return {BlockRecord | null}
     */
    get block(): BlockRecord | null;
    /** @param {Slot} slot the slot the rule now stands in */
    place(slot: Slot): void;
    /** @param {BlockRecord} block the record of the rule's children */
    setBlock(block: BlockRecord): void;
    /** @return {boolean} whether the rule has left the stylesheet; reading it does not throw */
    get departed(): boolean;
    /** @return {string[]} change it only through the methods of this class */
    get selectors(): string[];
    /** @return {Declaration[]} */
    get declarations(): Declaration[];
    /**
     * @return {RangePiece[] | null | undefined} undefined until the caller
     * sets them, and null when the token ranges of the selectors are not known
     */
    get pieces(): RangePiece[] | null | undefined;
    /** @param {RangePiece[] | null} pieces one per selector, or null */
    setPieces(pieces: RangePiece[] | null): void;
    /**
     * Takes the declarations of the rule as its own list, which the caller
     * keeps extending in place. The keys are derived again on the next read.
     *
     * @param {Declaration[]} declarations
     */
    takeDeclarations(declarations: Declaration[]): void;
    /**
     * Numbers the declarations so equal ones share a key. The numbering is
     * the caller's, and the keys last until the declarations change; adding
     * selectors leaves them valid.
     *
     * @param {(declaration: Declaration) => number} keyOf
     * @return {RuleDeclarationKeys}
     */
    declarationKeys(keyOf: (declaration: Declaration) => number): RuleDeclarationKeys;
    /**
     * @param {SelectorLookup} lookup
     * @return {VendorPrefixSummary}
     */
    vendorProfile(lookup: SelectorLookup): VendorPrefixSummary;
    /**
     * The elements the selector list can match, as `elementKeyOf` in
     * `elementKeys.js` describes them, or null when any selector has no key or
     * there are none, which must not read as a rule that writes to no element.
     * A caller must not hold the list across a change to the rule.
     *
     * @param {(selector: string, piece: RangePiece | null) => string | null} [keyOf] the key of one selector
     * @return {string[] | null}
     */
    elementKeys(keyOf?: (selector: string, piece: RangePiece | null) => string | null): string[] | null;
    /** @return {string} */
    selectorText(): string;
    /**
     * Lists of different lengths differ in text too, since a selector holds no
     * top-level comma, so the text of long lists is joined only when needed.
     *
     * @param {RuleMeta} other
     * @return {boolean}
     */
    hasSameSelectors(other: RuleMeta): boolean;
    /**
     * @param {string[]} selectors appended to the rule's selector list
     * @param {SelectorLookup} lookup
     * @param {(selector: string, piece: RangePiece | null) => string | null} [keyOf]
     * @param {RangePiece[] | null} [pieces] the token range of each selector of
     * the rule after the call, or null when they are not known
     * @return {readonly string[] | null} the element keys the selectors add to
     * those listed, or null when the rule's elements are not listed
     */
    addSelectors(selectors: string[], lookup: SelectorLookup, keyOf?: (selector: string, piece: RangePiece | null) => string | null, pieces?: RangePiece[] | null): readonly string[] | null;
    /**
     * @param {string[]} selectors replaces the rule's selector list
     * @param {VendorPrefixSummary} [vendor] the profile of `selectors` when the caller
     * already knows it; otherwise it is derived on the next `vendorProfile`
     */
    setSelectors(selectors: string[], vendor?: VendorPrefixSummary): void;
    /**
     * Takes the place of a rule that is dropped and stood before this one, so
     * its selectors come first. The dropped rule's list grows in place and
     * passes to this one, and the joined text is concatenated from the two
     * texts: copying or re-joining a long list on every merge would take
     * quadratic time.
     *
     * @param {RuleMeta} earlier left unusable
     * @param {SelectorLookup} lookup
     * @param {(selector: string, piece: RangePiece | null) => string | null} [keyOf]
     */
    absorbEarlier(earlier: RuleMeta, lookup: SelectorLookup, keyOf?: (selector: string, piece: RangePiece | null) => string | null): void;
    /** Marks the record of a rule that left the stylesheet, so a later read throws. */
    depart(): void;
}
/** @param {Rule} rule @return {Declaration[]} */
export declare function getDecls(rule: Rule): Declaration[];
//# sourceMappingURL=ruleMeta.d.ts.map