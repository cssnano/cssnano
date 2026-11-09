import cssnanoUtils from '#utils';
import { BlockRecords } from './blockRecords.js';
import {
  atRuleKind,
  BlockRecord,
  COMMENT,
  LAYER,
  NO_PRELUDE,
  NodeEntry,
  STYLESHEET,
} from './blockRecord.js';
import { containerContext } from './sameContainer.js';
import { hasPendingEdits } from '../deferredChildEdits.js';
import { sourceSelector } from '../../../../utils/sourceText.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {AtRule, ChildNode, Comment, Container, Root, Rule} from 'postcss' */
/** @import {RuleRecord} from './ruleRecord.js' */
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
function isRuleOrAtRule(node) {
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
    new BlockRecord(root, STYLESHEET, '', '', false, NO_PRELUDE),
    consistencyChecks
  );
  records.add(records.root);
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
    if (consistencyChecks && hasPendingEdits(container.node)) {
      throw new Error(PENDING_EDITS);
    }
    for (const child of /** @type {ChildNode[]} */ (container.node.nodes)) {
      if (isRuleOrAtRule(child)) nodes++;
      if (child.type === 'rule') {
        const source = sourceSelector(child);
        const record = records.recordRule(
          child,
          child.selectors,
          child.selector,
          source === child.selector ? undefined : source,
          textTable.stored(child)
        );
        record.before = child.raws.before ?? null;
        records.linkLast(container.index, record.index);
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
        const kind = atRuleKind(name);
        const nested = new BlockRecord(
          child,
          kind,
          name,
          child.params,
          kind === LAYER && isAnonymousLayer(child, textTable),
          context.declarations.preludeId(child)
        );
        nested.before = child.raws.before ?? null;
        records.add(nested);
        records.linkLast(container.index, nested.index);
        nested.context = containerContext(
          context.declarations,
          container.context,
          nested
        );
        fillChildren(nested);
      } else if (child.type === 'decl') {
        declarations++;
        const declaration = records.blockDeclaration(
          child,
          context.properties,
          context.declarations
        );
        records.linkLast(container.index, declaration.index);
      } else if (child.type === 'atrule') {
        const name = asciiLowerCase(child.name);
        const kind = atRuleKind(name);
        const entry = records.bareEntry(
          new NodeEntry(
            child,
            kind,
            name,
            child.params,
            kind === LAYER && isAnonymousLayer(child, textTable),
            context.declarations.preludeId(child)
          )
        );
        entry.before = child.raws.before ?? null;
        records.linkLast(container.index, entry.index);
      } else {
        const entry = records.bareEntry(
          new NodeEntry(child, COMMENT, '', '', false, NO_PRELUDE)
        );
        entry.before = child.raws.before ?? null;
        entry.text = /** @type {Comment} */ (child).text;
        entry.important = cssnanoUtils.isImportantComment(entry.text);
        records.linkLast(container.index, entry.index);
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
