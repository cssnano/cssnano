import { TokenType, tokens } from './value.js';

/**
 * @param {import('postcss').AtRule} node
 * @return {boolean}
 */
function isAnonymousLayer(node) {
  const params = node.params?.trim();
  if (!params) {
    return true;
  }
  if (!params.includes('/*')) {
    return false;
  }
  return !tokens(params).some((token) => token[0] === TokenType.Ident);
}

/**
 * @param {import('postcss').AnyNode} nodeA
 * @param {import('postcss').AnyNode} nodeB
 * @return {boolean}
 */
function checkMatch(nodeA, nodeB) {
  if (nodeA.type === 'atrule' && nodeB.type === 'atrule') {
    const nameA = nodeA.name.toLowerCase();
    const nameB = nodeB.name.toLowerCase();
    if (nameA !== nameB) {
      return false;
    }
    if (nameA === 'layer') {
      const anonA = isAnonymousLayer(
        /** @type {import('postcss').AtRule} */ (nodeA)
      );
      const anonB = isAnonymousLayer(
        /** @type {import('postcss').AtRule} */ (nodeB)
      );
      if (anonA || anonB) {
        return anonA && anonB && nodeA === nodeB;
      }
    }
    return nodeA.params === nodeB.params;
  }
  if (nodeA.type === 'rule' && nodeB.type === 'rule') {
    return (
      nodeA === nodeB ||
      /** @type {import('postcss').Rule} */ (nodeA).selector ===
        /** @type {import('postcss').Rule} */ (nodeB).selector
    );
  }
  return nodeA.type === nodeB.type;
}

/** @typedef {import('postcss').AnyNode & {parent?: Child}} Child */
/**
 * @param {Child} nodeA
 * @param {Child} nodeB
 * @return {boolean}
 */
function sameParent(nodeA, nodeB) {
  if (!nodeA.parent) {
    // A is orphaned, return if B is orphaned as well
    return !nodeB.parent;
  }

  if (!nodeB.parent) {
    // B is orphaned and A is not
    return false;
  }

  // Check if parents match
  if (!checkMatch(nodeA.parent, nodeB.parent)) {
    return false;
  }

  // Check parents' parents
  return sameParent(nodeA.parent, nodeB.parent);
}
export default sameParent;
