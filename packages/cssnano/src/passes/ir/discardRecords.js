import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from './blockRecord.js';
import { removeEntry } from './treeEdits.js';
import {
  joinKey,
  parseLayerNames,
  SEPARATOR,
} from '../../values/layerNames.js';
import { isBlankTokens } from '../../values/tokensText.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {TokenListId} from './tokenLists.js' */
/** @import {ArenaIndex} from './blockRecord.js' */

/** The name that the discardEmpty messages carry. */
export const DISCARD_PLUGIN = 'postcss-discard-empty';

/**
 * A per-entry transform that shares the discard walk. `enter` runs before the
 * children of a rule or an at-rule block, and `visit` on each kept entry after
 * its children.
 *
 * @typedef {{enter(index: ArenaIndex): void, visit(index: ArenaIndex): void}} EntryVisitor
 */

/**
 * Whether an entry is empty, as its PostCSS node is: a declaration with no value,
 * a rule with no selector, a block or rule with no children, an at-rule with no
 * prelude and no children, or a redundant named layer.
 *
 * @param {RunContext} context
 * @param {BlockRecord | NodeEntry | RuleRecord | DeclarationRecord} record
 * @param {number} childCount the live children of a rule or block; 0 otherwise
 * @param {boolean} isLayer whether the entry is a layer at-rule
 * @param {boolean} isRedundantLayer whether the entry is a named layer that declares nothing new
 * @return {boolean}
 */
function shouldDiscard(context, record, childCount, isLayer, isRedundantLayer) {
  const { tokenLists } = context;
  if (record.kind === DECLARATION) {
    return (
      isBlankTokens(tokenLists.get(record.valueList)) &&
      !record.prop.startsWith('--')
    );
  }
  if (record.kind === RULE) {
    return (
      record.selectorIds.every((id) => isBlankTokens(tokenLists.get(id))) ||
      (childCount === 0 && !isLayer) ||
      isRedundantLayer
    );
  }
  if (record.kind === AT_RULE_BLOCK || record.kind === AT_RULE_STATEMENT) {
    const hasChildren = record.kind === AT_RULE_BLOCK;
    const emptyPrelude = isBlankTokens(
      tokenLists.get(
        /** @type {TokenListId} */ (
          /** @type {BlockRecord | NodeEntry} */ (record).preludeId
        )
      )
    );
    return (
      (hasChildren && childCount === 0 && !isLayer) ||
      isRedundantLayer ||
      (emptyPrelude && (!hasChildren || childCount === 0))
    );
  }
  return false;
}

/**
 * Whether an entry is a layer at-rule.
 *
 * @param {{kind: number, name?: string}} record
 * @return {boolean}
 */
function isLayerRecord(record) {
  return (
    (record.kind === AT_RULE_BLOCK || record.kind === AT_RULE_STATEMENT) &&
    record.name === 'layer'
  );
}

/**
 * The walk of a stylesheet's records that discards the empty entries.
 * Post-order: each entry's children are visited before the entry, and a kept
 * entry is visited after them. The layers each open condition declares live
 * in a struct, not in closures.
 */
class DiscardWalk {
  /** @type {BlockRecords} */
  records;

  /** @type {RunContext} */
  context;

  /** @type {EntryVisitor | undefined} */
  visitor;

  /**
   * Layer keys declared in each open condition, outermost (top level) first.
   * A set is created on first use; most conditions declare no layer.
   * @type {(Set<string> | undefined)[]}
   */
  scopes = [undefined];

  /** Count of the blocks of layers that have no name. */
  unnamedLayers = 0;

  /**
   * @param {BlockRecords} records
   * @param {RunContext} context
   * @param {EntryVisitor | undefined} visitor
   */
  constructor(records, context, visitor) {
    this.records = records;
    this.context = context;
    this.visitor = visitor;
  }

  /**
   * @param {string} layerKey
   * @return {boolean}
   */
  isDeclared(layerKey) {
    return this.scopes.some((scope) => scope?.has(layerKey));
  }

  /**
   * Naming `a.b` also creates its parent `a` (CSS Cascade 5), so every prefix
   * of the path becomes declared.
   *
   * @param {string} parentKey
   * @param {string} name
   * @return {void}
   */
  declare(parentKey, name) {
    let key = parentKey;
    for (const segment of name.split(SEPARATOR)) {
      key = joinKey(key, segment);
      (this.scopes[this.scopes.length - 1] ??= new Set()).add(key);
    }
  }

  /**
   * Visits each child of a container in turn. The next sibling is read before
   * a child is visited, since a discard unlinks the child.
   *
   * @param {ArenaIndex} container
   * @param {boolean} isLayer layers are transparent to conditions
   * @param {string} layerKey
   * @return {void}
   */
  walkChildren(container, isLayer, layerKey) {
    if (!isLayer) this.scopes.push(undefined);
    const { links } = this.records;
    for (let entry = links.firstChild(container); entry !== -1;) {
      const next = links.nextSibling(entry);
      this.discardEmpty(entry, layerKey);
      entry = next;
    }
    if (!isLayer) this.scopes.pop();
  }

  /**
   * @param {ArenaIndex} index
   * @param {string} parentKey key of the enclosing layer, '' outside layers
   * @return {void}
   */
  discardEmpty(index, parentKey = '') {
    const { records, context } = this;
    const record = records.entry(index);
    const hasChildren = record.kind === RULE || record.kind === AT_RULE_BLOCK;
    const isLayer = isLayerRecord(record);
    // A block takes one name; an unnamed or invalid block gets a segment no
    // other layer can share.
    const names = isLayer
      ? parseLayerNames(
          context.tokenLists.get(
            /** @type {TokenListId} */ (
              /** @type {BlockRecord | NodeEntry} */ (record).preludeId
            )
          )
        )
      : undefined;
    const name = hasChildren && names?.length === 1 ? names[0] : undefined;
    let layerKey = parentKey;

    if (isLayer && hasChildren) {
      layerKey = joinKey(
        parentKey,
        name ?? `${SEPARATOR}${this.unnamedLayers++}`
      );
    } else if (names) {
      // `@layer a, b.c;` fixes the order of each listed layer.
      for (const listed of names) this.declare(parentKey, listed);
    }

    if (hasChildren) this.walkChildren(index, isLayer, layerKey);

    const childCount = hasChildren ? records.links.childCount(index) : 0;
    const isRedundantLayer =
      name !== undefined && childCount === 0 && this.isDeclared(layerKey);

    if (shouldDiscard(context, record, childCount, isLayer, isRedundantLayer)) {
      removeEntry(records, index);
      context.messages.push({ index, type: 'removal', plugin: DISCARD_PLUGIN });
    } else {
      if (name !== undefined) this.declare(parentKey, name);
      if (this.visitor) this.visitor.visit(index);
    }
  }
}

/**
 * Discards the empty entries of the stylesheet, and records each removal as a
 * message. `visitor` runs on each kept entry, after its children, so another
 * per-entry transform can share this walk.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {EntryVisitor} [visitor]
 * @return {void}
 */
export function discardEmptyRecords(records, context, visitor) {
  const walk = new DiscardWalk(records, context, visitor);
  const { links, root } = records;
  for (let entry = links.firstChild(root.index); entry !== -1;) {
    const next = links.nextSibling(entry);
    walk.discardEmpty(entry);
    entry = next;
  }
}

/**
 * Removes an entry that a transform no longer needs, then each ancestor the
 * removal empties, reporting each ancestor. An emptied named layer stays: it may
 * fix the order of its layer.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {void}
 */
export function removeAndDiscardEmptiedRecords(records, context, index) {
  const { links } = records;
  let parent = links.parentOf(index);
  removeEntry(records, index);
  while (parent !== -1) {
    const record = records.entry(parent);
    if (record.kind !== RULE && record.kind !== AT_RULE_BLOCK) break;
    const isLayer = isLayerRecord(record);
    if (
      !shouldDiscard(context, record, links.childCount(parent), isLayer, false)
    ) {
      break;
    }
    const next = links.parentOf(parent);
    removeEntry(records, parent);
    context.messages.push({
      index: parent,
      type: 'removal',
      plugin: DISCARD_PLUGIN,
    });
    parent = next;
  }
}
