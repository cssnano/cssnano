import { createRunContext } from '../../../../../../src/passes/ir/runContext.js';
import postcss from 'postcss';
import {
  commitToNodes,
  declarationsFromNodes,
} from '../../../../../../src/passes/merge/lib/longhand/nodeDeclarations.js';
import { TextTable } from '../../../../../../src/values/textTable.js';

/** @import {DeclarationItem} from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js' */
/** @import {BlockDeclarations} from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js' */

/**
 * The declaration items a round reads from the declarations written as `css`.
 *
 * @param {string} css declarations, such as `width: 5dvh; height: 1px`
 * @return {DeclarationItem[]}
 */
export function itemsOf(css) {
  const { list } = declarationsFromNodes(
    /** @type {import('postcss').Rule} */ (postcss.parse(`a{${css}}`).first),
    createRunContext(new TextTable())
  );
  /** @type {DeclarationItem[]} */
  const items = [];
  for (let position = 0; position < list.length; position++) {
    items.push(list.at(position));
  }
  return items;
}

/**
 * The list of the block of a rule written as `css`, such as `a{width:1px}`.
 *
 * @param {string} css
 * @return {BlockDeclarations}
 */
export function blockOf(css) {
  return declarationsFromNodes(
    /** @type {import('postcss').Rule} */ (postcss.parse(css).first),
    createRunContext(new TextTable())
  ).list;
}

/**
 * The item of one declaration, such as `width: 5dvh`.
 *
 * @param {string} css
 * @return {DeclarationItem}
 */
export function itemOf(css) {
  return itemsOf(css)[0];
}

/**
 * Runs a reduction on the block of a rule's declarations, then writes the block
 * back to the rule.
 *
 * @param {import('postcss').Container} rule
 * @param {TextTable} textTable
 * @param {(list: BlockDeclarations, positions: number[]) => void} reduce
 * @return {void}
 */
export function reduceBlock(rule, textTable, reduce) {
  const block = declarationsFromNodes(rule, createRunContext(textTable));
  const positions = [];
  for (let position = 0; position < block.list.length; position++) {
    positions.push(position);
  }
  reduce(block.list, positions);
  commitToNodes(block, textTable);
}
