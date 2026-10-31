import { DeclarationRecord } from '../../../ir/declarationRecord.js';

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
export function childEntries(node, declarations) {
  let comment = false;
  for (const child of node.nodes) {
    if (child.type === 'rule' || child.type === 'atrule') return null;
    if (child.type !== 'decl') comment = true;
  }
  if (!comment) return null;
  /** @type {(DeclarationRecord | ChildNode)[]} */
  const entries = [];
  let next = 0;
  for (const child of node.nodes) {
    entries.push(child.type === 'decl' ? declarations[next++] : child);
  }
  return entries;
}

/**
 * Whether a child record describes the child node at the same place.
 *
 * @param {DeclarationRecord | ChildNode} child
 * @param {ChildNode} node
 * @return {boolean}
 */
function describes(child, node) {
  if (!(child instanceof DeclarationRecord)) return child === node;
  return (
    child.node === node &&
    child.prop === node.prop &&
    child.value === node.value &&
    child.important === (node.important === true)
  );
}

/**
 * Whether the records of a rule's children describe the nodes it holds, and
 * its declarations are exactly the declaration children, in order.
 *
 * @param {Rule} node
 * @param {(DeclarationRecord | ChildNode)[] | null} entries
 * @param {DeclarationRecord[]} declarations
 * @return {boolean}
 */
export function matchesNode(node, entries, declarations) {
  const nodes = node.nodes;
  const children = entries ?? declarations;
  if (children.length !== nodes.length) return false;
  for (let index = 0; index < children.length; index++) {
    if (!describes(children[index], nodes[index])) return false;
  }
  if (!entries) return true;
  let next = 0;
  for (const entry of entries) {
    if (entry instanceof DeclarationRecord && declarations[next++] !== entry) {
      return false;
    }
  }
  return next === declarations.length;
}

/**
 * Gives an appended child the whitespace of the last child when it has none,
 * as PostCSS gives it, so the records keep what the node will print.
 *
 * @param {ChildNode} node
 * @param {DeclarationRecord | ChildNode | undefined} last the child before `node`
 * @return {void}
 */
export function inheritWhitespace(node, last) {
  if (node.raws.before !== undefined || last === undefined) return;
  const sample =
    last instanceof DeclarationRecord
      ? last.node.raws.before
      : last.raws.before;
  if (sample !== undefined) node.raws.before = sample.replaceAll(/\S/gv, '');
}

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
export function removeClaimed(children, declarations, claimed, taken) {
  let kept = 0;
  let written = 0;
  let position = 0;
  for (const child of children) {
    if (child instanceof DeclarationRecord) {
      if (claimed.has(position++)) {
        taken?.push(child);
        continue;
      }
      declarations[kept++] = child;
    }
    children[written++] = child;
  }
  children.length = written;
  declarations.length = kept;
}
