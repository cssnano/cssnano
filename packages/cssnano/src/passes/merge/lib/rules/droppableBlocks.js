import cssnanoUtils from '#utils';
import { isConditionalGroupRule } from './lastWriteIndex.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {ChildNode} from 'postcss' */
/** @import {TextTable} from '../../../../values/textTable.js' */

/**
 * @param {ChildNode} node
 * @param {TextTable} textTable
 * @return {boolean}
 */
function isNamedLayerBlock(node, textTable) {
  return (
    node.type === 'atrule' &&
    asciiLowerCase(node.name) === 'layer' &&
    node.nodes !== undefined &&
    !isAnonymousLayer(node, textTable)
  );
}

/**
 * True for a block that applies nothing once it is empty.
 *
 * @param {ChildNode} node
 * @param {TextTable} textTable
 * @return {boolean}
 */
export function isDroppableWhenEmpty(node, textTable) {
  return isConditionalGroupRule(node) || isNamedLayerBlock(node, textTable);
}
