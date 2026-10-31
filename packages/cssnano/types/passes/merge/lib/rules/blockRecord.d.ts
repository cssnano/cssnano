/** @import {ChildNode, Container} from 'postcss' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {Slot} from './blockRecords.js' */
import type { ChildNode, Container } from 'postcss';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { Slot } from './blockRecords.js';
/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. `children` has one
 * entry per child, in order: a slot for a rule, the record of a nested
 * at-rule, or the PostCSS node of anything else. Entries are never spliced
 * out, so a removed entry is left in place and skipped.
 */
export declare class BlockRecord {
    /** @type {Container} */
    node: Container;
    /** @type {number} the index of the block whose children hold this one's entry, -1 for the stylesheet */
    parent: number;
    /** @type {number} where the entry stands among the children of `parent` */
    position: number;
    /** @type {boolean} whether the block applies nothing once it is empty */
    droppable: boolean;
    /** @type {(Slot | BlockRecord | DeclarationRecord | ChildNode)[]} */
    children: (Slot | BlockRecord | DeclarationRecord | ChildNode)[];
    /**
     * The live children of a droppable block during a sweep, or null while the
     * block is not tracked. Dropping an emptied `@layer` is safe because a rule
     * moves only into an equivalent earlier block, which already orders the
     * layer. A block empty at sweep start is untracked because it may be the
     * first statement that orders its layer.
     *
     * @type {number | null}
     */
    remaining: number | null;
    /** @type {boolean} whether a sweep removed the block for being empty */
    dropped: boolean;
    /** @type {number} the place of the block in the arena of its records, -1 until added */
    index: number;
    /**
     * The whitespace before the first child of the stylesheet, which PostCSS
     * hands on when that child is removed. Only the record of the stylesheet
     * holds it.
     *
     * @type {string | undefined}
     */
    leadingWhitespace: string | undefined;
    /**
     * Where the first live entry stood when last looked up. A dead entry never
     * becomes live again, so the lookup resumes here rather than at the start.
     * `BlockRecords#firstLiveChild` reads and advances it.
     *
     * @type {number}
     */
    firstLive: number;
    /**
     * @param {Container} node
     * @param {number} parent the index of the block whose children hold this one's entry, -1 for the stylesheet
     * @param {number} position
     * @param {boolean} droppable
     */
    constructor(node: Container, parent: number, position: number, droppable: boolean);
}
//# sourceMappingURL=blockRecord.d.ts.map