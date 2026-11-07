import { firstDeclaration, nextDeclaration } from './blockChildren.js';
import {
  BlockRecord,
  CONDITIONAL_GROUP,
  isAtRuleKind,
  NodeEntry,
} from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { PropertyWrites } from './propertyWrites.js';

/** @import {PropertyKeys} from '../../../ir/propertyTable.js' */
/** @import {BlockRecords} from './blockRecords.js' */

// Conditional group rules hold ordinary rules whose declarations cascade as
// they do at the top level. Any other at-rule may depend on its position, as
// `@layer` statements and `@import` do for layer order, or have effects this
// module does not model, so a move across one is never safe.

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
  constructor() {
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
   * @param {BlockRecords} records the arena that holds the entries
   * @param {DeclarationRecord | RuleRecord | BlockRecord | NodeEntry} entry a
   * live entry of a block
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   * @return {void}
   */
  recordNode(records, entry, position, keysOf) {
    this.#recordNode(records, entry, position, null, keysOf);
  }

  /**
   * @param {BlockRecords} records
   * @param {DeclarationRecord | RuleRecord | BlockRecord | NodeEntry} entry
   * @param {number} position
   * @param {string[] | null} keys
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  #recordNode(records, entry, position, keys, keysOf) {
    if (entry instanceof RuleRecord) {
      const own = keysOf(entry);
      if (entry.context !== -1) {
        this.#recordBlock(records, entry.index, position, own, keysOf);
        return;
      }
      // A rule without a block writes its declarations only.
      for (
        let declaration = firstDeclaration(records, entry.index);
        declaration !== undefined;
        declaration = nextDeclaration(records, declaration)
      )
        this.record(declaration.keys, position, own);
    } else if (entry instanceof BlockRecord) {
      // Only an at-rule has a block record among the entries.
      if (entry.kind === CONDITIONAL_GROUP) {
        this.#recordBlock(records, entry.index, position, keys, keysOf);
      } else {
        this.#lastBarrier = Math.max(this.#lastBarrier, position);
      }
    } else if (entry instanceof DeclarationRecord) {
      this.record(entry.keys, position, keys);
    } else if (
      entry instanceof NodeEntry &&
      isAtRuleKind(entry.kind) &&
      entry.kind !== CONDITIONAL_GROUP
    ) {
      this.#lastBarrier = Math.max(this.#lastBarrier, position);
    }
  }

  /**
   * Records the writes of every live entry of a block, in place, since a copy
   * of the children would cost an allocation at every block.
   *
   * @param {BlockRecords} records
   * @param {number} block the index of the block, or of the rule that nests
   * @param {number} position
   * @param {string[] | null} keys
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  #recordBlock(records, block, position, keys, keysOf) {
    const { links } = records;
    for (
      let entry = links.firstChild(block);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      this.#recordNode(records, records.entry(entry), position, keys, keysOf);
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
   * @param {BlockRecords} records
   * @param {(RuleRecord | DeclarationRecord)[]} entries
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   * @return {boolean}
   */
  conflictsSinceIn(records, entries, position, keysOf) {
    const elements = this.#elementScratch;
    elements.clear();
    for (const entry of entries) {
      const own = entry instanceof RuleRecord ? keysOf(entry) : null;
      if (own === null)
        return this.#conflictsIn(records, entries, position, null);
      for (const key of own) elements.add(key);
    }
    return this.#conflictsIn(records, entries, position, elements);
  }

  /**
   * @param {BlockRecords} records
   * @param {(RuleRecord | DeclarationRecord)[]} entries
   * @param {number} position
   * @param {Set<string> | null} elements
   * @return {boolean}
   */
  #conflictsIn(records, entries, position, elements) {
    if (this.#lastBarrier > position) return true;
    for (const entry of entries) {
      if (entry instanceof RuleRecord) {
        if (this.#ruleConflicts(records, entry, position, elements))
          return true;
      } else if (this.#conflictsWith(entry.keys, position, elements)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Whether a write after `position` conflicts with a declaration of `rule`,
   * which are its own declarations, or the declarations of its nested block.
   *
   * @param {BlockRecords} records
   * @param {RuleRecord} rule
   * @param {number} position
   * @param {Set<string> | null} elements
   * @return {boolean}
   */
  #ruleConflicts(records, rule, position, elements) {
    if (rule.context === -1) {
      for (
        let declaration = firstDeclaration(records, rule.index);
        declaration !== undefined;
        declaration = nextDeclaration(records, declaration)
      ) {
        if (this.#conflictsWith(declaration.keys, position, elements)) {
          return true;
        }
      }
      return false;
    }
    const { links } = records;
    for (
      let entry = links.firstChild(rule.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (
        item instanceof DeclarationRecord &&
        this.#conflictsWith(item.keys, position, elements)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Entries that moved to `position` are written there now: each rule record
   * writes its declarations under the element keys `keysOf` gives it. Every
   * entry only ever moves forward, so a later write to the same property
   * is kept.
   *
   * @param {BlockRecords} records
   * @param {(RuleRecord | DeclarationRecord)[]} entries
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  moveWrites(records, entries, position, keysOf) {
    const { links } = records;
    for (const entry of entries) {
      if (entry instanceof RuleRecord) {
        // `record` only reads the keys, so the record's own list is passed as is.
        const keys = keysOf(entry);
        const own = keys?.length ? keys : null;
        if (entry.context === -1) {
          for (
            let declaration = firstDeclaration(records, entry.index);
            declaration !== undefined;
            declaration = nextDeclaration(records, declaration)
          ) {
            this.record(declaration.keys, position, own);
          }
          continue;
        }
        for (
          let item = links.firstChild(entry.index);
          item !== -1;
          item = links.nextSibling(item)
        ) {
          const declaration = records.entry(item);
          if (declaration instanceof DeclarationRecord) {
            this.record(declaration.keys, position, own);
          }
        }
      } else {
        this.record(entry.keys, position, null);
      }
    }
  }
}
