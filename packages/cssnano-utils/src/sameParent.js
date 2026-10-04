import isAnonymousLayer from './isAnonymousLayer.js';

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
 * True if two containers apply their content the same way: they are equal
 * blocks, and so are their enclosing blocks up to the stylesheet. Either may
 * be missing, for a node that is detached.
 *
 * @param {import('postcss').Container | undefined} containerA
 * @param {import('postcss').Container | undefined} containerB
 * @return {boolean}
 */
export function sameContainer(containerA, containerB) {
  if (!containerA || !containerB) {
    return !containerA && !containerB;
  }
  const a = /** @type {Child} */ (/** @type {unknown} */ (containerA));
  const b = /** @type {Child} */ (/** @type {unknown} */ (containerB));
  return (
    checkMatch(a, b) &&
    sameContainer(
      /** @type {import('postcss').Container | undefined} */ (a.parent),
      /** @type {import('postcss').Container | undefined} */ (b.parent)
    )
  );
}

/**
 * @param {Child} nodeA
 * @param {Child} nodeB
 * @return {boolean}
 */
function sameParent(nodeA, nodeB) {
  return sameContainer(
    /** @type {import('postcss').Container | undefined} */ (nodeA.parent),
    /** @type {import('postcss').Container | undefined} */ (nodeB.parent)
  );
}
export default sameParent;
