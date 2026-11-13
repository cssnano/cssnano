import { AT_RULE_BLOCK, DECLARATION, RULE } from '../passes/ir/blockRecord.js';
import { recordContextOf } from './context.js';
import { visitDeclaration } from './declarationWalk.js';
import { isOutermostOverridable } from './overridable.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {DeclarationPlans} from './declarationWalk.js' */

/**
 * The state of the record walk over one stylesheet: the outermost overridable
 * at-rules it has visited, in document order.
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

  /**
   * @param {BlockRecords} records
   * @param {RunContext} context
   * @param {DeclarationPlans | undefined} plans what the walk applies to the declarations, when the run has stages
   */
  constructor(records, context, plans) {
    this.#records = records;
    this.#context = context;
    this.#plans = plans;
  }

  /**
   * Visits the children of a container in document order, each before its own
   * children. A rule or an at-rule with a block passes its context down, which
   * is computed when the walk enters it.
   *
   * @param {ArenaIndex} container
   * @param {number} context the context of the container
   * @return {void}
   */
  walkChildren(container, context) {
    const records = this.#records;
    const { links } = records;
    for (let entry = links.firstChild(container); entry !== -1;) {
      // Read before the entry is visited, so a visit may remove the entry.
      const next = links.nextSibling(entry);
      if (isOutermostOverridable(records, entry)) this.found.push(entry);
      const { kind } = records.entry(entry);
      if (kind === RULE || kind === AT_RULE_BLOCK) {
        this.walkChildren(
          entry,
          recordContextOf(records, this.#context.tokenLists, entry, context)
        );
      } else if (kind === DECLARATION && this.#plans !== undefined) {
        visitDeclaration(this.#plans, records, this.#context, context, entry);
      }
      entry = next;
    }
  }
}

/**
 * The record walk of a stylesheet, in document order: a container before its
 * children. It applies the declaration plans to each declaration, collects the
 * outermost overridable at-rules, which the discard of discardOverridden
 * compares, and computes the context of each container it enters.
 *
 * @param {BlockRecords} records the build of the stylesheet
 * @param {RunContext} context the run that built the records; its token lists read the values
 * @param {DeclarationPlans} [plans] what the walk applies to the declarations; none leaves them as built
 * @return {ArenaIndex[]} the outermost overridable at-rules, in document order
 */
export function walkDown(records, context, plans) {
  const walk = new RecordWalk(records, context, plans);
  // The stylesheet has no parent, so its context is the empty one.
  walk.walkChildren(records.root.index, 0);
  return walk.found;
}
