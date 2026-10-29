import cssnanoUtils from '#utils';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {BlockRecord} from './blockRecords.js' */

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

/**
 * True if two blocks apply their content the same way: they are equal blocks,
 * and so are their enclosing blocks up to the stylesheet. Either may be null,
 * for a block that has no record.
 *
 * @param {BlockRecord | null | undefined} blockA
 * @param {BlockRecord | null | undefined} blockB
 * @param {TextTable} textTable the selector tokens the walk stored, which give
 *   each layer's prelude when it has a comment
 * @return {boolean}
 */
export function sameContainer(blockA, blockB, textTable) {
  if (!blockA || !blockB) {
    return !blockA && !blockB;
  }
  return (
    checkMatch(
      /** @type {import('postcss').AnyNode} */ (blockA.node),
      /** @type {import('postcss').AnyNode} */ (blockB.node),
      textTable
    ) && sameContainer(blockA.parent, blockB.parent, textTable)
  );
}
