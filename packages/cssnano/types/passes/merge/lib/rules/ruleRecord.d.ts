import { SelectorList } from './selectorList.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { ChildNode, Declaration, Rule } from 'postcss';
import type { ArenaIndex, NodeEntry } from './blockRecord.js';
export type RuleDeclarationKeys = {
    /**
     * the ids of the declarations of the rule, in order
     */
    keys: number[];
    /**
     * the ids of the declarations
     */
    keySet: Set<number>;
};
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { ElementKeyOf, SelectorLookup } from './selectorList.js';
import type { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { BlockRecords } from './blockRecords.js';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ChildNode, Declaration, Rule} from 'postcss' */
/** @import {ArenaIndex, NodeEntry} from './blockRecord.js' */
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {number[]} keys the ids of the declarations of the rule, in order
 * @property {Set<number>} keySet the ids of the declarations
 */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {ElementKeyOf, SelectorLookup} from './selectorList.js' */
/** @import {VendorPrefixSummary} from './vendorPrefixSummary.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * @param {ChildNode} node
 * @return {node is Declaration}
 */
export declare function isDeclaration(node: ChildNode): node is Declaration;
/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, and its children. The children form a chain in the arena
 * of `BlockRecords`, so the record refers to no other record. Every field is
 * set up front so all instances share one object layout.
 */
export declare class RuleRecord extends SelectorList {
    #private;
    /**
     * The id of the circumstances under which the rule applies its children, as
     * `containerContext` gives it. It is set once, at the build, for a rule that
     * holds a rule or an at-rule; -1 for any other rule.
     *
     * @type {number}
     */
    context: number;
    /** @type {ArenaIndex} the place of the record in the arena of its records, -1 until added */
    index: ArenaIndex;
    /** @type {number} RULE, which the window reads with the other records */
    kind: number;
    /** @type {string} '' for a rule, which has no at-rule name */
    name: string;
    /** @type {string} '' for a rule, which has no prelude */
    params: string;
    /** @type {boolean} false for a rule, which is no layer */
    anonymous: boolean;
    /** @type {number} NO_PRELUDE for a rule */
    preludeId: number;
    /**
     * The arena index of the rule whose raws a merged rule prints, or -1 for a
     * rule that keeps its own. A merged rule copies the raws of its template.
     *
     * @type {number}
     */
    template: number;
    /** @type {string | null} the whitespace before the rule, as its node gives it at the build */
    before: string | null;
    /**
     * @param {Rule} node the rule the record describes
     * @param {string[]} selectors
     * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
     * @param {string | undefined} sourceSelector the source text, set only when it differs from the selector
     * @param {readonly CSSToken[] | undefined} tokens the stored tokens of the source text
     */
    constructor(node: Rule, selectors: string[], selector: string, sourceSelector: string | undefined, tokens: readonly CSSToken[] | undefined);
    /**
     * Whether the rule has left the stylesheet. Only consistency checks read it;
     * no decision does.
     *
     * @return {boolean}
     */
    get departed(): boolean;
    /** @return {string[]} change it only through the methods of this class */
    get selectors(): string[];
    /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
    get pieces(): RangePiece[] | null | undefined;
    /** @param {string} selector the selector, in PostCSS's form */
    setSelector(selector: string): void;
    /** @param {readonly CSSToken[]} tokens the tokens of the source text */
    setTokens(tokens: readonly CSSToken[]): void;
    /** @return {readonly CSSToken[]} the tokens of the source text, tokenized at the first read */
    tokensOf(): readonly CSSToken[];
    /** @return {import('./selectorList.js').SelectorRanges} the token range of each selector */
    rangesOf(): import('./selectorList.js').SelectorRanges;
    /** Marks the selector as written by a merge. */
    mark(): void;
    /** @param {RangePiece[] | null} pieces one per selector, or null */
    setPieces(pieces: RangePiece[] | null): void;
    /**
     * The ids of the declarations of the rule. They are read from the chain once,
     * and kept until an edit that is not a declaration appended at its end. Under
     * checks, the result throws once the rule is edited after this call.
     *
     * @param {BlockRecords} records the arena that holds the rule's children
     * @return {RuleDeclarationKeys}
     */
    declarationKeys(records: BlockRecords): RuleDeclarationKeys;
    /**
     * The declarations of the rule, in order, read from its chain at the call. A
     * reader that indexes them by position takes this array.
     *
     * @param {BlockRecords} records the arena that holds the rule's children
     * @return {DeclarationRecord[]}
     */
    declarationsOf(records: BlockRecords): DeclarationRecord[];
    /**
     * Called by `BlockLinks` once a child is linked into the chain of the rule.
     * A declaration linked at the end joins the kept ids; any other link drops
     * them.
     *
     * @param {DeclarationRecord | NodeEntry | RuleRecord | import('./blockRecord.js').BlockRecord} child
     *   the record of the child that was linked
     * @param {boolean} atEnd whether the child was linked after the last entry
     * @return {void}
     */
    childLinked(child: DeclarationRecord | NodeEntry | RuleRecord | import('./blockRecord.js').BlockRecord, atEnd: boolean): void;
    /** Called by `BlockLinks` once a child is unlinked from the chain of the rule. */
    childUnlinked(): void;
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
}
//# sourceMappingURL=ruleRecord.d.ts.map