import { createRunContext } from '../../../../../../src/passes/ir/runContext.js';
import postcss from 'postcss';
import { buildRecords } from '../../../../../../src/passes/ir/buildRecords.js';
import { declarationsFromRecords } from '../../../../../../src/passes/merge/lib/longhand/recordDeclarations.js';
import { commitDeclarations } from '../../../../../../src/passes/ir/arenaEdits.js';
import { writeBack } from '../../../../../../src/passes/ir/writeBack.js';
import { TextTable } from '../../../../../../src/values/textTable.js';
import cssnanoUtils from '../../../../../../src/utils/index.js';

const { tokens } = cssnanoUtils;

/** @import {Container} from 'postcss' */
/** @import {DeclarationItem} from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js' */
/** @import {BlockDeclarations} from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js' */
/** @import {BlockRecords} from '../../../../../../src/passes/ir/blockRecords.js' */
/** @import {ArenaIndex} from '../../../../../../src/passes/ir/blockRecord.js' */
/** @import {RunContext} from '../../../../../../src/passes/ir/runContext.js' */

/**
 * A block read from the records of its stylesheet, with what writing it back
 * needs.
 *
 * @typedef {object} ReadBlock
 * @property {BlockDeclarations} list
 * @property {BlockRecords} records
 * @property {Array<import('postcss').Node>} nodes the node of each entry
 * @property {ArenaIndex} index the block's index in the records
 */

/**
 * Reads the block of a rule from the records of the stylesheet it is in.
 *
 * @param {Container} rule a rule attached to a root
 * @param {RunContext} run
 * @return {ReadBlock}
 */
export function readBlock(rule, run) {
  const { records, nodes } = buildRecords(rule.root(), run);
  const index = /** @type {ArenaIndex} */ (nodes.indexOf(rule));
  return {
    list: declarationsFromRecords(records, run, index),
    records,
    nodes,
    index,
  };
}

/**
 * Commits a list read by `readBlock` and writes the stylesheet back to its nodes.
 *
 * @param {ReadBlock} block
 * @param {RunContext} run
 * @return {void}
 */
export function writeBlock(block, run) {
  commitDeclarations(block.records, run, block.index, block.list);
  writeBack(block.records, block.nodes, run.tokenLists, run.textTable);
}

/**
 * The declaration items a round reads from the declarations written as `css`.
 *
 * @param {string} css declarations, such as `width: 5dvh; height: 1px`
 * @return {DeclarationItem[]}
 */
function itemsOf(css) {
  const { list } = readBlock(
    /** @type {Container} */ (postcss.parse(`a{${css}}`).first),
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
  return readBlock(
    /** @type {Container} */ (postcss.parse(css).first),
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
 * @param {Container} rule
 * @param {TextTable} textTable
 * @param {(list: BlockDeclarations, positions: number[]) => void} reduce
 * @return {BlockDeclarations} the list as the reduction left it
 */
export function reduceBlock(rule, textTable, reduce) {
  const run = createRunContext(textTable);
  const block = readBlock(rule, run);
  const positions = [];
  for (let position = 0; position < block.list.length; position++) {
    positions.push(position);
  }
  reduce(block.list, positions);
  writeBlock(block, run);
  return block.list;
}

/**
 * Whether the tokens of each live item spell its text, so a reader that takes
 * the tokens of an edited item reads what the text says.
 *
 * @param {BlockDeclarations} list
 * @return {boolean}
 */
export function itemTokensSpellText(list) {
  for (let position = 0; position < list.length; position++) {
    const item = list.at(position);
    if (item.removed) continue;
    const stored = item.tokens.map((token) => token.slice(0, 4));
    const spelled = tokens(item.value).map((token) => token.slice(0, 4));
    if (JSON.stringify(stored) !== JSON.stringify(spelled)) return false;
  }
  return true;
}
