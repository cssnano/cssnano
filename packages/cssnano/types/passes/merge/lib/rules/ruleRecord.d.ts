import type { TokenListId } from '../../../ir/tokenLists.js';
import { RULE } from './blockRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { RuleElementKeys } from './elementKeys.js';
import type { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { ArenaIndex } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleElementKeys} from './elementKeys.js' */
/** @import {VendorPrefixSummary} from './vendorPrefixSummary.js' */
/** @import {ArenaIndex, NodeEntry} from './blockRecord.js' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * What the merge knows of a rule: its selector list, with the facts folded from
 * its ids, and its children. The children form a chain in the arena
 * of `BlockRecords`, so the record refers to no other record. Every field is
 * set up front so all instances share one object layout.
 */
export declare class RuleRecord {
    /**
     * The interned id of each selector, in order. A selector's id is the same
     * for every rule that holds an equal item. It is read-only: only the
     * functions of this module move or append ids.
     *
     * @readonly
     * @type {readonly TokenListId[]}
     */
    readonly selectorIds: readonly TokenListId[];
    /**
     * Whether every selector suits the target browsers.
     *
     * @readonly
     * @type {boolean}
     */
    readonly compatible: boolean;
    /**
     * The vendor prefix summary of the selectors.
     *
     * @readonly
     * @type {VendorPrefixSummary}
     */
    readonly vendor: VendorPrefixSummary;
    /**
     * The element keys of the selectors, or null when a selector has none. The
     * list is empty when the rule has no selectors.
     *
     * @readonly
     * @type {RuleElementKeys | null}
     */
    readonly elementKeys: RuleElementKeys | null;
    /**
     * Whether an edit changed the rule's list, so write-back must write its
     * selector. Every edit that changes the ids sets it.
     *
     * @readonly
     * @type {boolean}
     */
    readonly marked: boolean;
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
    /** @type {typeof RULE} RULE, which the window reads with the other records */
    kind: typeof RULE;
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
     * @param {readonly TokenListId[]} selectorIds the interned id of each selector
     */
    constructor(selectorIds: readonly TokenListId[]);
    /**
     * The declarations of the rule, in order, read from its chain at the call. A
     * reader that indexes them by position takes this array.
     *
     * @param {BlockRecords} records the arena that holds the rule's children
     * @return {DeclarationRecord[]}
     */
    declarationsOf(records: BlockRecords): DeclarationRecord[];
}
//# sourceMappingURL=ruleRecord.d.ts.map