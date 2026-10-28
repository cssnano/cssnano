import cssnanoUtils from '#utils';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {TextTable} from '../../../../values/textTable.js' */

/**
 * @param {import('postcss').AnyNode} nodeA
 * @param {import('postcss').AnyNode} nodeB
 * @param {TextTable} textTable
 * @return {boolean}
 */
function checkMatch(nodeA, nodeB, textTable) {
  if (nodeA.type === 'atrule' && nodeB.type === 'atrule') {
    const nameA = asciiLowerCase(nodeA.name);
    const nameB = asciiLowerCase(nodeB.name);
    if (nameA !== nameB) {
      return false;
    }
    if (nameA === 'layer') {
      const anonA = isAnonymousLayer(
        /** @type {import('postcss').AtRule} */ (nodeA),
        textTable
      );
      const anonB = isAnonymousLayer(
        /** @type {import('postcss').AtRule} */ (nodeB),
        textTable
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

/**
 * True for `@keyframes` and its vendor-prefixed forms, whose selectors are
 * cascaded by position.
 *
 * @param {import('postcss').Container | undefined} container
 * @return {boolean}
 */
export function isKeyframes(container) {
  return (
    container?.type === 'atrule' &&
    asciiLowerCase(
      /** @type {import('postcss').AtRule} */ (container).name
    ).includes('keyframes')
  );
}

/** @typedef {import('postcss').AnyNode & {parent?: Child}} Child */

/**
 * True if two containers apply their content the same way: they are equal
 * blocks, and so are their enclosing blocks up to the stylesheet. Either may
 * be missing, for a node that is detached.
 *
 * @param {import('postcss').Container | undefined} containerA
 * @param {import('postcss').Container | undefined} containerB
 * @param {TextTable} textTable the selector tokens the walk stored, which give
 *   each layer's prelude when it has a comment
 * @return {boolean}
 */
export function sameContainer(containerA, containerB, textTable) {
  if (!containerA || !containerB) {
    return !containerA && !containerB;
  }
  const a = /** @type {Child} */ (/** @type {unknown} */ (containerA));
  const b = /** @type {Child} */ (/** @type {unknown} */ (containerB));
  return (
    checkMatch(a, b, textTable) &&
    sameContainer(
      /** @type {import('postcss').Container | undefined} */ (a.parent),
      /** @type {import('postcss').Container | undefined} */ (b.parent),
      textTable
    )
  );
}
