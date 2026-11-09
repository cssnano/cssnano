import cssnanoUtils from '#utils';
import { BlockRecords } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';
import { recordDeclaration } from '../../../ir/declarationRecord.js';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  atRuleKindOf,
  BlockRecord,
  COMMENT,
  LAYER,
  NO_AT_RULE,
  NO_PRELUDE,
  NodeEntry,
  STYLESHEET,
} from './blockRecord.js';
import { containerContext } from './sameContainer.js';
import { hasPendingEdits } from '../deferredChildEdits.js';
import { sourceSelector } from '../../../../utils/sourceText.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {AtRule, ChildNode, Comment, Container, Root, Rule} from 'postcss' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */

/**
 * Builds the records of a stylesheet from its tree, which the window's edits
 * then change. The build is the only code of the window that reads the nodes.
 */

/**
 * @param {ChildNode} node
 * @return {boolean} whether the node holds rules or at-rules
 */
export function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

const PENDING_EDITS = 'a container has edits its child list does not show';

/**
 * Builds the records of a stylesheet from its tree, once per run. Each child is
 * linked into the chain of its parent, and every rule is a container whose
 * children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {BlockRecords}
 */
export function buildRecords(root, context) {
  const { textTable, consistencyChecks } = context;
  const records = new BlockRecords(
    new BlockRecord(root, STYLESHEET, NO_AT_RULE, '', '', false, NO_PRELUDE),
    consistencyChecks
  );
  records.root.leadingWhitespace = root.first?.raws.before ?? null;
  let nodes = 0;
  let declarations = 0;
  /**
   * Links each child of a container, which holds its context already, in
   * document order. A rule is linked into its parent, then its children.
   *
   * @param {BlockRecord | RuleRecord} container
   */
  const fillChildren = (container) => {
    // The build reads the child lists, which a pending edit has not rebuilt yet.
    const node = /** @type {Container} */ (records.nodeOf(container.index));
    if (consistencyChecks && hasPendingEdits(node)) {
      throw new Error(PENDING_EDITS);
    }
    for (const child of /** @type {ChildNode[]} */ (node.nodes)) {
      if (isRuleOrAtRule(child)) nodes++;
      if (child.type === 'rule') {
        const source = sourceSelector(child);
        const record = new RuleRecord(
          child,
          child.selectors,
          child.selector,
          source === child.selector ? undefined : source,
          textTable.stored(child)
        );
        record.before = child.raws.before ?? null;
        records.appendEntry(container.index, record);
        // A rule that holds a rule or an at-rule nests, and gets its context.
        if (child.nodes.some(isRuleOrAtRule)) {
          record.context = containerContext(
            context.declarations,
            container.context,
            record
          );
        }
        fillChildren(record);
      } else if (child.type === 'atrule' && child.nodes) {
        const name = asciiLowerCase(child.name);
        const category = atRuleKindOf(name);
        const nested = new BlockRecord(
          child,
          AT_RULE_BLOCK,
          category,
          name,
          child.params,
          category === LAYER && isAnonymousLayer(child, textTable),
          context.declarations.preludeId(child)
        );
        nested.before = child.raws.before ?? null;
        records.appendEntry(container.index, nested);
        nested.context = containerContext(
          context.declarations,
          container.context,
          nested
        );
        fillChildren(nested);
      } else if (child.type === 'decl') {
        declarations++;
        records.appendEntry(
          container.index,
          recordDeclaration(child, context.properties, context.declarations)
        );
      } else if (child.type === 'atrule') {
        const name = asciiLowerCase(child.name);
        const category = atRuleKindOf(name);
        const entry = new NodeEntry(
          child,
          AT_RULE_STATEMENT,
          category,
          name,
          child.params,
          category === LAYER && isAnonymousLayer(child, textTable),
          context.declarations.preludeId(child)
        );
        entry.before = child.raws.before ?? null;
        records.appendEntry(container.index, entry);
      } else {
        const entry = new NodeEntry(
          child,
          COMMENT,
          NO_AT_RULE,
          '',
          '',
          false,
          NO_PRELUDE
        );
        entry.before = child.raws.before ?? null;
        entry.text = /** @type {Comment} */ (child).text;
        entry.important = cssnanoUtils.isImportantComment(entry.text);
        records.appendEntry(container.index, entry);
      }
    }
  };
  // The stylesheet's context is the one for no enclosing container.
  records.root.context = containerContext(
    context.declarations,
    -1,
    records.root
  );
  fillChildren(records.root);
  records.settle();
  // N + D + 1 rounds bound a run, see `runMerge`.
  records.maxRounds = nodes + declarations + 1;
  return records;
}
