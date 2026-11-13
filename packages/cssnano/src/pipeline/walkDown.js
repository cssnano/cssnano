import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from '../passes/ir/blockRecord.js';
import { writeContainerContext } from '../passes/ir/arenaEdits.js';
import { containerContext } from '../passes/ir/sameContainer.js';
import { sourceListOf } from '../passes/ir/writtenList.js';
import { isDefaultNamespace } from '../plugins/postcss-minify-selectors/lib/isDefaultNamespace.js';
import { DEFAULT_NAMESPACE, recordContextOf, withBit } from './context.js';
import { visitDeclaration } from './declarationWalk.js';
import { isOutermostOverridable } from './overridable.js';
import { visitRule } from './ruleWalk.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {DeclarationPlans} from './declarationWalk.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/** @import {BlockRecord, NodeEntry} from '../passes/ir/blockRecord.js' */
/** @import {RuleRecord} from '../passes/ir/ruleRecord.js' */

/**
 * The state of the record walk over one stylesheet: the outermost overridable
 * at-rules it has visited, in document order, and whether a default
 * `@namespace` has been passed.
 */
class RecordWalk {
  /** @type {ArenaIndex[]} */
  found = [];
  /** @type {BlockRecords} */
  #records;
  /** @type {RunContext} */
  #context;
  /** @type {DeclarationPlans | undefined} */
  #plans;
  /** @type {boolean} */
  #defaultNamespace = false;

  /**
   * @param {BlockRecords} records
   * @param {RunContext} context
   * @param {DeclarationPlans | undefined} plans what the walk applies to the declarations and rules, when the run has stages
   */
  constructor(records, context, plans) {
    this.#records = records;
    this.#context = context;
    this.#plans = plans;
  }

  /**
   * Notes a default `@namespace`, from its prelude as the walk leaves it. Rules
   * after it have the default namespace in their fold's context.
   *
   * @param {ArenaIndex} index an at-rule record
   */
  #noteNamespace(index) {
    if (this.#defaultNamespace) return;
    const record = /** @type {BlockRecord | NodeEntry} */ (
      this.#records.entry(index)
    );
    if (record.name !== 'namespace') return;
    const list = /** @type {TokenListId} */ (sourceListOf(record));
    if (isDefaultNamespace(this.#context.tokenLists.get(list))) {
      this.#defaultNamespace = true;
    }
  }

  /**
   * The context of a container after the walk's edits to it, which its
   * selector or prelude may have changed. A rule that holds no container has
   * no context, and keeps -1.
   *
   * @param {ArenaIndex} index a rule or an at-rule with a block
   * @param {number} parentContext the refreshed context of the container that holds it
   * @returns {number}
   */
  #refreshContext(index, parentContext) {
    const record = /** @type {BlockRecord | RuleRecord} */ (
      this.#records.entry(index)
    );
    if (record.context === -1) return -1;
    const context = containerContext(
      this.#context.declarations,
      parentContext,
      record
    );
    writeContainerContext(record, context);
    return context;
  }

  /**
   * Runs the rule and at-rule part of the walk over a container before its
   * children, then walks the children with the context the container takes.
   *
   * @param {ArenaIndex} index a rule or an at-rule with a block
   * @param {number} context the context the container's parent passes down
   * @param {number} parentContext the refreshed context of the container that holds it
   */
  #walkContainer(index, context, parentContext) {
    const { kind } = this.#records.entry(index);
    const bits = recordContextOf(
      this.#records,
      this.#context.tokenLists,
      index,
      context
    );
    let own = /** @type {BlockRecord | RuleRecord} */ (
      this.#records.entry(index)
    ).context;
    if (this.#plans !== undefined) {
      if (kind === RULE) {
        const foldBits = this.#defaultNamespace
          ? withBit(bits, DEFAULT_NAMESPACE)
          : bits;
        visitRule(this.#plans, this.#records, this.#context, foldBits, index);
      } else {
        this.#noteNamespace(index);
      }
      own = this.#refreshContext(index, parentContext);
    }
    this.walkChildren(index, bits, own);
  }

  /**
   * Visits the children of a container in document order, each before its own
   * children. A rule or an at-rule with a block passes its context down, which
   * is computed when the walk enters it.
   *
   * @param {ArenaIndex} container
   * @param {number} context the context of the container
   * @param {number} ownContext the refreshed context of the container, which its children take as their parent's
   * @return {void}
   */
  walkChildren(container, context, ownContext) {
    const records = this.#records;
    const { links } = records;
    for (let entry = links.firstChild(container); entry !== -1;) {
      // Read before the entry is visited, so a visit may remove the entry.
      const next = links.nextSibling(entry);
      if (isOutermostOverridable(records, entry)) this.found.push(entry);
      const { kind } = records.entry(entry);
      if (kind === RULE || kind === AT_RULE_BLOCK) {
        this.#walkContainer(entry, context, ownContext);
      } else if (kind === DECLARATION && this.#plans !== undefined) {
        visitDeclaration(this.#plans, records, this.#context, context, entry);
      } else if (kind === AT_RULE_STATEMENT && this.#plans !== undefined) {
        this.#noteNamespace(entry);
      }
      entry = next;
    }
  }
}

/**
 * The record walk of a stylesheet, in document order: a container before its
 * children. It applies the declaration and selector plans to each declaration
 * and rule, collects the outermost overridable at-rules, which the discard of
 * discardOverridden compares, and computes the context of each container it
 * enters, after the edits to that container.
 *
 * @param {BlockRecords} records the build of the stylesheet
 * @param {RunContext} context the run that built the records; its token lists read the values
 * @param {DeclarationPlans} [plans] what the walk applies to the declarations and rules; none leaves them as built
 * @return {ArenaIndex[]} the outermost overridable at-rules, in document order
 */
export function walkDown(records, context, plans) {
  const walk = new RecordWalk(records, context, plans);
  // The stylesheet has no parent, so its context is the empty one.
  walk.walkChildren(records.root.index, 0, records.root.context);
  return walk.found;
}
