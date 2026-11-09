import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { Rule } from 'postcss';
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { SelectorRange } from '../../../../values/selectorRanges.js';
import type { SelectorIds } from '../../../ir/selectorIds.js';
export type SelectorLookup = (selector: string, list?: SelectorList, index?: number) => import('./ensureCompatibility.js').SelectorInfo;
export type ElementKeyOf = (selector: string, piece: RangePiece | null) => string | null;
export type SelectorRanges = {
    source: string;
    tokens: readonly CSSToken[];
    spans: SelectorRange[];
};
/**
 * The selector list of a rule with the facts derived from it, each computed on
 * first use and then grown incrementally as the list grows. It is the base of
 * `RuleRecord`, not a member of it, so a rule is one object with one layout.
 *
 * It also holds the text the rule spells: the selector in PostCSS's form, the
 * source text when its comments make it differ, and the tokens of that text.
 */
export declare class SelectorList {
    #private;
    /**
     * @param {Rule | undefined} node
     * @param {string[]} selectors
     * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
     * @param {string} [sourceSelector] the source text, set only when it differs from the selector
     * @param {readonly CSSToken[]} [tokens] the stored tokens of the source text
     */
    constructor(node: Rule | undefined, selectors: string[], selector: string, sourceSelector?: string, tokens?: readonly CSSToken[]);
    /**
     * @return {Rule} the rule the list belongs to. A merged rule has none until
     * write-back gives it one, so a caller reads it only after that.
     */
    get node(): Rule;
    /** @return {boolean} whether the rule has a node yet */
    get hasNode(): boolean;
    /**
     * Gives a merged rule its node. Write-back calls it once, for a rule that
     * the tree reaches.
     *
     * @param {Rule} node
     */
    giveNode(node: Rule): void;
    /** @return {string[]} change it only through the methods of this class */
    get selectors(): string[];
    /** @return {string} the selector, in PostCSS's form */
    get selector(): string;
    /** @return {string} the text the list spells, with its comments */
    get sourceText(): string;
    /** @return {readonly CSSToken[] | undefined} the tokens of the source text, undefined until known */
    get tokens(): readonly CSSToken[] | undefined;
    /** @return {boolean} whether the table holds the tokens, so they need no write-back */
    get listStored(): boolean;
    /** @return {boolean} whether a merge wrote the selector, so write-back assigns it */
    get marked(): boolean;
    /** Marks the selector as written by a merge. */
    mark(): void;
    /**
     * Sets the selector the rule spells. Its source text and tokens belonged to
     * the old text, so they are dropped.
     *
     * @param {string} selector
     */
    setSelector(selector: string): void;
    /**
     * Gives the list tokens that the table does not hold yet, which write-back stores.
     *
     * @param {readonly CSSToken[]} tokens the tokens of the source text
     */
    setTokens(tokens: readonly CSSToken[]): void;
    /** Records that write-back stored the tokens in the table. */
    markStored(): void;
    /**
     * The tokens of the source text, which the first reader tokenizes and keeps.
     *
     * @return {readonly CSSToken[]}
     */
    tokensOf(): readonly CSSToken[];
    /**
     * The token ranges of the selectors, found in the tokens of the source text.
     * They are derived at the first read, and derived again only when the tokens
     * change.
     *
     * @return {SelectorRanges}
     */
    rangesOf(): SelectorRanges;
    /** @param {RangePiece[] | null} pieces one per selector, or null */
    setPieces(pieces: RangePiece[] | null): void;
    /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
    get pieces(): RangePiece[] | null | undefined;
    /**
     * @param {SelectorLookup} lookup
     * @return {VendorPrefixSummary}
     */
    vendorProfile(lookup: SelectorLookup): VendorPrefixSummary;
    /**
     * Whether every selector is compatible with the target browsers. It is read
     * once and then kept: a grown list ANDs in the answer for its new selectors.
     *
     * @param {SelectorLookup} lookup
     * @return {boolean}
     */
    compatible(lookup: SelectorLookup): boolean;
    /**
     * The elements the selector list can match, as `elementKeyOf` in
     * `elementKeys.js` describes them, or null when any selector has no key or
     * there are none, which must not read as a rule that writes to no element.
     * A caller must not hold the list across a change to the list.
     *
     * @param {ElementKeyOf} [keyOf] the key of one selector
     * @return {string[] | null}
     */
    elementKeys(keyOf?: ElementKeyOf): string[] | null;
    /** @return {string} */
    selectorText(): string;
    /**
     * The interned id of each selector, in order. They are read on the first
     * comparison, and an edit of the selectors drops them.
     *
     * @param {SelectorIds} selectorIds
     * @return {readonly number[]}
     */
    idsOf(selectorIds: SelectorIds): readonly number[];
    /**
     * Two lists are the same when they have the same selectors in the same
     * order. A selector holds no top-level comma, so the joined texts of two
     * lists are equal exactly when their selectors are, and the ids compare the
     * selectors without joining them.
     *
     * @param {SelectorList} other
     * @param {SelectorIds} selectorIds
     * @return {boolean}
     */
    hasSameSelectors(other: SelectorList, selectorIds: SelectorIds): boolean;
    /**
     * @param {string[]} selectors appended to the list
     * @param {SelectorLookup} lookup
     * @param {ElementKeyOf} [keyOf]
     * @param {RangePiece[] | null} [pieces] the token range of each selector of
     * the list after the call, or null when they are not known
     * @return {readonly string[] | null} the element keys the selectors add to
     * those listed, or null when the elements are not listed
     */
    addSelectors(selectors: string[], lookup: SelectorLookup, keyOf?: ElementKeyOf, pieces?: RangePiece[] | null): readonly string[] | null;
    /**
     * Takes the place of a list that stood before this one, so its selectors
     * come first. The earlier list grows in place and passes to this one, and
     * the joined text is concatenated from the two texts: copying or re-joining
     * a long list on every merge would take quadratic time.
     *
     * @param {SelectorList} earlier left unusable
     * @param {SelectorLookup} lookup
     * @param {ElementKeyOf} [keyOf]
     */
    absorbEarlier(earlier: SelectorList, lookup: SelectorLookup, keyOf?: ElementKeyOf): void;
}
//# sourceMappingURL=selectorList.d.ts.map