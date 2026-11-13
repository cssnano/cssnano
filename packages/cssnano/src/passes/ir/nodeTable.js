import postcss from 'postcss';
import { AT_RULE_STATEMENT, DECLARATION, RULE } from './blockRecord.js';
import { tokensText } from '../../values/tokensText.js';

/** @import {ChildNode, Root} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {TokenListId, TokenLists} from './tokenLists.js' */

/**
 * The PostCSS node of each entry, by the entry's arena index. The build fills
 * a slot for each entry it makes; write-back pushes a slot for each merged rule
 * it creates a node for. Nothing clears a slot.
 *
 * @typedef {(Root | ChildNode | undefined)[]} NodeTable
 */

/**
 * The node of the entry at `index`, or undefined past the end of the table and
 * for a merged rule that write-back has not reached.
 *
 * @param {NodeTable} nodes
 * @param {number} index
 * @return {Root | ChildNode | undefined}
 */
export function nodeOf(nodes, index) {
  return nodes[index];
}

/**
 * The node of a declaration that an edit appended, with the template's source
 * and the record's property, value, importance and raws. Write-back gives it
 * its whitespace before.
 *
 * @param {DeclarationRecord} record
 * @param {import('postcss').Declaration} template the node whose source the new node takes
 * @param {TokenLists} tokenLists
 * @return {import('postcss').Declaration}
 */
function declarationNode(record, template, tokenLists) {
  const node = postcss.decl({
    prop: record.prop,
    value: tokensText(tokenLists.get(record.valueList)),
    important: record.important,
    source: template.source,
  });
  if (record.between !== null) node.raws.between = record.between;
  if (record.important && record.importantSpelling !== null) {
    node.raws.important = record.importantSpelling;
  }
  return node;
}

/**
 * Gives each child of a rebuilt container that has no node its node: a merged
 * rule gets one with the template's source, and an appended declaration gets
 * one from its record. Write-back fills the rest.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} container the index of the rebuilt container
 * @param {TokenLists} tokenLists the run's token lists, which the declarations' values name
 * @return {void}
 */
export function createChildNodes(records, nodes, container, tokenLists) {
  for (
    let entry = records.links.firstChild(container);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (nodeOf(nodes, entry) !== undefined) continue;
    while (nodes.length <= entry) nodes.push(undefined);
    if (record.kind === RULE) {
      const template = /** @type {import('postcss').Rule} */ (
        nodeOf(nodes, record.template)
      );
      // The node has no selector yet, which PostCSS's props type does not allow.
      nodes[entry] = postcss.rule(
        /** @type {import('postcss').RuleProps} */ ({
          source: template.source,
        })
      );
    } else if (record.kind === DECLARATION) {
      const template = /** @type {import('postcss').Declaration} */ (
        nodeOf(nodes, record.template)
      );
      nodes[entry] = declarationNode(record, template, tokenLists);
    } else if (record.kind === AT_RULE_STATEMENT) {
      nodes[entry] = postcss.atRule({
        name: record.name,
        params: tokensText(
          tokenLists.get(/** @type {TokenListId} */ (record.preludeId))
        ),
        source: nodeOf(nodes, record.template)?.source,
      });
    }
  }
}
