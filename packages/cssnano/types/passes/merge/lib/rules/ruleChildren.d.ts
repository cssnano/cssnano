import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { ChildNode, Rule } from 'postcss';
/** @import {ChildNode, Rule} from 'postcss' */
/**
 * The children of a rule that holds a comment, in order, or null when its
 * children are its declarations. A rule that holds a rule or an at-rule keeps
 * its children in its block, so it has none here.
 *
 * @param {Rule} node
 * @param {DeclarationRecord[]} declarations the records of the declarations of `node`, in order
 * @return {(DeclarationRecord | ChildNode)[] | null}
 */
export declare function childEntries(node: Rule, declarations: DeclarationRecord[]): (DeclarationRecord | ChildNode)[] | null;
/**
 * Whether the records of a rule's children describe the nodes it holds, and
 * its declarations are exactly the declaration children, in order.
 *
 * @param {Rule} node
 * @param {(DeclarationRecord | ChildNode)[] | null} entries
 * @param {DeclarationRecord[]} declarations
 * @return {boolean}
 */
export declare function matchesNode(node: Rule, entries: (DeclarationRecord | ChildNode)[] | null, declarations: DeclarationRecord[]): boolean;
/**
 * Gives an appended child the whitespace of the last child when it has none,
 * as PostCSS gives it, so the records keep what the node will print.
 *
 * @param {ChildNode} node
 * @param {DeclarationRecord | ChildNode | undefined} last the child before `node`
 * @return {void}
 */
export declare function inheritWhitespace(node: ChildNode, last: DeclarationRecord | ChildNode | undefined): void;
/**
 * Removes the declarations at `claimed` from the children and from the
 * declarations, compacting both lists in one pass. Comments stay in order.
 * The nodes are left as they are, for write-back to drop.
 *
 * @param {(DeclarationRecord | ChildNode)[]} children the entries, or the declarations when there are no comments
 * @param {DeclarationRecord[]} declarations
 * @param {Set<number>} claimed the positions of the declarations that leave
 * @param {DeclarationRecord[]} [taken] receives the records of the removed declarations, in order
 * @return {void}
 */
export declare function removeClaimed(children: (DeclarationRecord | ChildNode)[], declarations: DeclarationRecord[], claimed: Set<number>, taken?: DeclarationRecord[]): void;
//# sourceMappingURL=ruleChildren.d.ts.map