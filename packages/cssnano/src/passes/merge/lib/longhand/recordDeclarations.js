import { BlockDeclarations, RUN_END } from './blockDeclarations.js';
import { holdsImportantComment } from './holdsImportantComment.js';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from '../rules/blockRecord.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../rules/blockRecord.js' */
/** @import {BlockRecords} from '../rules/blockRecords.js' */
/** @import {RuleRecord} from '../rules/ruleRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {DeclarationItem} from './blockDeclarations.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */

/**
 * The item of a declaration record: its text, which the value list spells, and
 * the fields a reducer reads or an edit writes.
 *
 * @param {DeclarationRecord} record
 * @param {RunContext} context
 * @return {DeclarationItem}
 */
function itemOf(record, context) {
  const tokens = context.tokenLists.get(record.valueList);
  return {
    prop: record.prop,
    value: tokensText(tokens),
    tokens,
    important: record.important,
    before: record.before ?? undefined,
    between: record.between ?? undefined,
    importantSpelling: record.importantSpelling ?? undefined,
    inheritedSupport: record.inheritedSupport,
    kept: holdsImportantComment(tokens),
    removed: false,
    rewritten: false,
    source: -1,
  };
}

/**
 * Whether a child of a block ends a run of declarations: a nested rule with
 * children, or an at-rule, as `endsDeclarationRun` gives for nodes. A bare
 * comment and an empty rule do not.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
 * @return {boolean}
 */
function endsRun(records, entry) {
  switch (entry.kind) {
    case AT_RULE_BLOCK:
    case AT_RULE_STATEMENT:
      return true;
    case RULE:
      return (
        records.links.firstChild(/** @type {ArenaIndex} */ (entry.index)) !== -1
      );
    default:
      return false;
  }
}

/**
 * Reads the declarations of a block's chain into a list, with the run ends
 * among them. The list holds the declarations' text and tokens; the records
 * are read, not written.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context the run's token lists, which the value lists name
 * @param {ArenaIndex} container the index of the block or rule
 * @return {BlockDeclarations}
 */
export function declarationsFromRecords(records, context, container) {
  /** @type {DeclarationItem[]} */
  const items = [];
  /** @type {number[]} */
  const chain = [];
  /** @type {ArenaIndex[]} */
  const indexes = [];
  for (
    let entry = records.links.firstChild(container);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(/** @type {ArenaIndex} */ (entry));
    if (record.kind === DECLARATION) {
      const declaration = /** @type {DeclarationRecord} */ (record);
      chain.push(items.length);
      items.push(itemOf(declaration, context));
      indexes.push(/** @type {ArenaIndex} */ (declaration.index));
    } else if (endsRun(records, record)) {
      chain.push(RUN_END);
    }
  }
  return new BlockDeclarations(items, chain, indexes);
}
