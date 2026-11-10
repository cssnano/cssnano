import type { TokenListId } from '../../../ir/tokenLists.js';
/** @import {TokenListId} from '../../../ir/tokenLists.js' */
import { SelectorList } from './selectorList.js';
import { RULE } from './blockRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {ArenaIndex, NodeEntry} from './blockRecord.js' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, and its children. The children form a chain in the arena
 * of `BlockRecords`, so the record refers to no other record. Every field is
 * set up front so all instances share one object layout.
 */
export declare class RuleRecord extends SelectorList {
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
     * @param {string[]} selectors
     * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
     * @param {readonly TokenListId[]} selectorIds the interned id of each of `selectors`
     */
    constructor(selectors: string[], selector: string, selectorIds: readonly TokenListId[]);
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