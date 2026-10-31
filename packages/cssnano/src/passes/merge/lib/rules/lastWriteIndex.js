import cssnanoUtils from '#utils';
import { Slot } from './blockRecords.js';
import { BlockRecord } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { PropertyWrites } from './propertyWrites.js';

/** @import {AtRule, ChildNode, Rule} from 'postcss' */
/** @import {PropertyKeys} from '../../../ir/propertyTable.js' */
/** @import {BlockRecords} from './blockRecords.js' */

// Conditional group rules hold ordinary rules whose declarations cascade as
// they do at the top level. Any other at-rule may depend on its position, as
// `@layer` statements and `@import` do for layer order, or have effects this
// module does not model, so a move across one is never safe.
const conditionalGroupRules = new Set(['media', 'supports', 'container']);

/**
 * @param {ChildNode} node
 * @return {node is AtRule}
 */
export function isConditionalGroupRule(node) {
  return (
    node.type === 'atrule' &&
    conditionalGroupRules.has(cssnanoUtils.asciiLowerCase(node.name))
  );
}

/**
 * A table of the latest position at which each property was declared among
 * the children of one parent, visited in document order. It tells whether a
 * conflicting declaration appears after a given position, in time linear in
 * the number of longhands the property expands to. The answers match
 * `isConflictingProp`; the table only computes them faster.
 *
 * Writes are also grouped by the element they set, so a move to known
 * elements ignores writes to other elements: a writer whose element is
 * unknown counts for every move.
 *
 * Positions are chosen by the caller and increase in document order. A
 * declaration at position p does not count as appearing after p.
 */
export default class LastWriteIndex {
  /** @type {PropertyWrites} */
  #all;
  /** @type {PropertyWrites} */
  #unknownElement;
  /** @type {Map<string, PropertyWrites>} */
  #byElement = new Map();
  #lastBarrier = -1;
  // Reused by conflictsSinceIn, so a check allocates no set of its own.
  #elementScratch = /** @type {Set<string>} */ (new Set());
  /** @type {BlockRecords} */
  #records;

  /** @param {BlockRecords} records the arena that holds the blocks and rules the entries name */
  constructor(records) {
    this.#records = records;
    this.#all = new PropertyWrites();
    this.#unknownElement = new PropertyWrites();
  }

  /**
   * @param {PropertyKeys} keys the keys of a declaration's property name
   * @param {number} position
   * @param {readonly string[] | null} [elements] element keys of the writing
   * rule, or null when they are unknown
   */
  record(keys, position, elements = null) {
    this.#all.record(keys, position);
    if (elements === null) {
      this.#unknownElement.record(keys, position);
      return;
    }
    for (const element of elements) {
      let writes = this.#byElement.get(element);
      if (!writes) {
        writes = new PropertyWrites();
        this.#byElement.set(element, writes);
      }
      writes.record(keys, position);
    }
  }

  /**
   * Record every write a child of the parent makes, under the element keys
   * `keysOf` gives its rule. An at-rule that is not a conditional group rule is
   * a barrier, since moving anything across it is not known to preserve the
   * cascade.
   *
   * @param {ChildNode | DeclarationRecord | RuleRecord | BlockRecord} entry a
   * live entry of a block
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   * @return {void}
   */
  recordNode(entry, position, keysOf) {
    this.#recordNode(entry, position, null, keysOf);
  }

  /**
   * @param {ChildNode | DeclarationRecord | RuleRecord | BlockRecord} entry
   * @param {number} position
   * @param {string[] | null} keys
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  #recordNode(entry, position, keys, keysOf) {
    if (entry instanceof RuleRecord) {
      const own = keysOf(entry);
      if (entry.block !== -1) {
        const block = /** @type {BlockRecord} */ (
          this.#records.block(entry.block)
        );
        this.#recordBlock(block, position, own, keysOf);
        return;
      }
      // A rule without a block writes its declarations only.
      for (const declaration of entry.declarations)
        this.record(declaration.keys, position, own);
    } else if (entry instanceof BlockRecord) {
      // Only an at-rule has a block record among the entries.
      if (isConditionalGroupRule(/** @type {AtRule} */ (entry.node))) {
        this.#recordBlock(entry, position, keys, keysOf);
      } else {
        this.#lastBarrier = Math.max(this.#lastBarrier, position);
      }
    } else if (entry instanceof DeclarationRecord) {
      this.record(entry.keys, position, keys);
    } else if (entry.type === 'atrule' && !isConditionalGroupRule(entry)) {
      this.#lastBarrier = Math.max(this.#lastBarrier, position);
    }
  }

  /**
   * Records the writes of every live entry of a block, in place, since a copy
   * of the children would cost an allocation at every block.
   *
   * @param {BlockRecord} block
   * @param {number} position
   * @param {string[] | null} keys
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  #recordBlock(block, position, keys, keysOf) {
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        for (const index of entry.rules) {
          const record = /** @type {RuleRecord} */ (this.#records.rule(index));
          this.#recordNode(record, position, keys, keysOf);
        }
      } else if (!(entry instanceof BlockRecord && entry.dropped)) {
        this.#recordNode(entry, position, keys, keysOf);
      }
    }
  }

  /**
   * Whether a write after `position` conflicts with one of `declarations`,
   * counting only writes that can set an element in `elements`, the non-empty
   * element keys of the rules moving to `position`. Null counts every write.
   *
   * @param {DeclarationRecord[]} declarations
   * @param {number} position
   * @param {Iterable<string> | null} [elements]
   * @return {boolean}
   */
  conflictsSince(declarations, position, elements = null) {
    if (this.#lastBarrier > position) return true;
    // Plain loops, so the check allocates nothing per call.
    for (const declaration of declarations) {
      if (this.#conflictsWith(declaration.keys, position, elements))
        return true;
    }
    return false;
  }

  /**
   * @param {PropertyKeys} keys
   * @param {number} position
   * @param {Iterable<string> | null} elements the element keys, or null for
   * every element
   * @return {boolean}
   */
  #conflictsWith(keys, position, elements) {
    if (elements === null) return this.#all.lastConflict(keys) > position;
    if (this.#unknownElement.lastConflict(keys) > position) return true;
    for (const element of elements) {
      const writes = this.#byElement.get(element);
      if (writes && writes.lastConflict(keys) > position) return true;
    }
    return false;
  }

  /**
   * `conflictsSince` for entries that move with their rules: rule records,
   * whose declarations take the keys `keysOf` gives, and bare declarations,
   * which count every write. Unknown keys count every write.
   *
   * @param {(RuleRecord | DeclarationRecord)[]} entries
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   * @return {boolean}
   */
  conflictsSinceIn(entries, position, keysOf) {
    const elements = this.#elementScratch;
    elements.clear();
    for (const entry of entries) {
      const own = entry instanceof RuleRecord ? keysOf(entry) : null;
      if (own === null) return this.#conflictsIn(entries, position, null);
      for (const key of own) elements.add(key);
    }
    return this.#conflictsIn(entries, position, elements);
  }

  /**
   * @param {(RuleRecord | DeclarationRecord)[]} entries
   * @param {number} position
   * @param {Set<string> | null} elements
   * @return {boolean}
   */
  #conflictsIn(entries, position, elements) {
    if (this.#lastBarrier > position) return true;
    for (const entry of entries) {
      if (entry instanceof RuleRecord) {
        const list = this.#listOf(entry);
        for (const declaration of list) {
          if (
            declaration instanceof DeclarationRecord &&
            this.#conflictsWith(declaration.keys, position, elements)
          ) {
            return true;
          }
        }
      } else if (this.#conflictsWith(entry.keys, position, elements)) {
        return true;
      }
    }
    return false;
  }

  /**
   * The children that hold the declarations a rule writes: its nested block's
   * children when it holds one, else its declarations.
   *
   * @param {RuleRecord} entry
   * @return {readonly (DeclarationRecord | BlockRecord | Slot | ChildNode)[]}
   */
  #listOf(entry) {
    if (entry.block === -1) return entry.declarations;
    const block = /** @type {BlockRecord} */ (this.#records.block(entry.block));
    return block.children;
  }

  /**
   * Entries that moved to `position` are written there now: each rule record
   * writes its declarations under the element keys `keysOf` gives it. Every
   * entry only ever moves forward, so a later write to the same property
   * is kept.
   *
   * @param {(RuleRecord | DeclarationRecord)[]} entries
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  moveWrites(entries, position, keysOf) {
    for (const entry of entries) {
      if (entry instanceof RuleRecord) {
        // `record` only reads the keys, so the record's own list is passed as is.
        const keys = keysOf(entry);
        const list = this.#listOf(entry);
        for (const declaration of list) {
          if (declaration instanceof DeclarationRecord) {
            this.record(declaration.keys, position, keys?.length ? keys : null);
          }
        }
      } else {
        this.record(entry.keys, position, null);
      }
    }
  }
}
