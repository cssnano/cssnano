import cssnanoUtils from '#utils';
import { BlockRecord, Slot } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';

/** @import {AtRule, ChildNode, Declaration, Rule} from 'postcss' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
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

/** @param {Map<string | number, number>} map @param {string | number} key @param {number} position */
function raise(map, key, position) {
  if ((map.get(key) ?? -1) < position) map.set(key, position);
}

/**
 * A table of the latest position of each property, grouped by the first word
 * of its name, for relating properties the property data does not describe,
 * such as unknown vendor-prefixed properties. Ignoring vendor prefixes, two
 * property names are related when they start with the same hyphen-separated
 * word and are either equal or differ in word count: `mask` and `mask-image`
 * are related, `mask-image` and `mask-size` are not.
 */
class SegmentIndex {
  #byLead;
  #everything;
  constructor() {
    /** @type {Map<string, {lengths: Map<string | number, number>, names: Map<string | number, number>}>} */
    this.#byLead = new Map();
    this.#everything = { lengths: new Map(), names: new Map() };
  }

  /**
   * Stores `position` as the latest position for the property's word count
   * and for its unprefixed name, both in the hash table for its first word
   * and in the table covering all properties.
   *
   * @param {{lead: string, length: number, bare: string}} keys
   * @param {number} position
   */
  record({ lead, length, bare }, position) {
    let leading = this.#byLead.get(lead);
    if (!leading) {
      leading = { lengths: new Map(), names: new Map() };
      this.#byLead.set(lead, leading);
    }
    for (const group of [leading, this.#everything]) {
      raise(group.lengths, length, position);
      raise(group.names, bare, position);
    }
  }

  /**
   * Latest position of a related property, or -1 if there is none. The first
   * word `place` matches any first word, because shorthands such as
   * `place-content` set longhands named with other words (`align-content`).
   * Time is linear in the number of distinct word counts recorded.
   *
   * @param {{lead: string, length: number, bare: string}} keys
   * @return {number}
   */
  newest({ lead, length, bare }) {
    const groups =
      lead === 'place'
        ? [this.#everything]
        : [this.#byLead.get(lead), this.#byLead.get('place')];
    let newest = -1;
    for (const group of groups) {
      if (!group) continue;
      newest = Math.max(newest, group.names.get(bare) ?? -1);
      for (const [recordedLength, position] of group.lengths) {
        if (recordedLength !== length) newest = Math.max(newest, position);
      }
    }
    return newest;
  }
}

/**
 * The latest position at which each property was declared, for one property
 * table: the answers match `isConflictingProp`, in time linear in the number
 * of longhands the property expands to.
 */
export class PropertyWrites {
  /** @type {PropertyTable} */
  #table;
  /** @type {Map<string | number, number>} */
  #lastCustom = new Map();
  /** @type {Map<string | number, number>} */
  #lastName = new Map();
  /** @type {Map<string | number, number>} */
  #lastLonghand = new Map();
  // Per logical property group, one position for physical writes and one for
  // flow-relative writes: only members on opposite sides can address the same
  // side of the box.
  /** @type {Map<string | number, number>} */
  #lastSide = new Map();
  #anySegments = new SegmentIndex();
  #unknownSegments = new SegmentIndex();
  #lastAll = -1;
  // Newest write that `all` resets: #everything except `direction`,
  // `unicode-bidi` and custom properties.
  #lastResettable = -1;

  /** @param {PropertyTable} table keys every declaration this index sees */
  constructor(table) {
    this.#table = table;
  }

  /**
   * @param {{prop: string}} declaration
   * @param {number} position
   */
  record(declaration, position) {
    const keys = this.#table.keysOf(declaration.prop);
    if (keys.custom) {
      raise(this.#lastCustom, keys.key, position);
      return;
    }
    if (keys.all) {
      this.#lastAll = Math.max(this.#lastAll, position);
      this.#lastResettable = Math.max(this.#lastResettable, position);
      return;
    }
    if (keys.subjectToAll) {
      this.#lastResettable = Math.max(this.#lastResettable, position);
    }
    raise(this.#lastName, keys.name, position);
    for (const { name, side } of keys.longhands) {
      raise(this.#lastLonghand, name, position);
      if (side) raise(this.#lastSide, side, position);
    }
    this.#anySegments.record(keys, position);
    if (!keys.known) this.#unknownSegments.record(keys, position);
  }

  /**
   * Position of the newest write that conflicts with `declaration`, or -1.
   *
   * @param {{prop: string}} declaration
   * @return {number}
   */
  lastConflict(declaration) {
    const keys = this.#table.keysOf(declaration.prop);
    if (keys.custom) return this.#lastCustom.get(keys.key) ?? -1;
    if (keys.all) return this.#lastResettable;
    let newest = Math.max(
      this.#lastName.get(keys.name) ?? -1,
      keys.subjectToAll ? this.#lastAll : -1
    );
    if (!keys.known) return Math.max(newest, this.#anySegments.newest(keys));
    for (const { name, opposite } of keys.longhands) {
      newest = Math.max(newest, this.#lastLonghand.get(name) ?? -1);
      if (opposite)
        newest = Math.max(newest, this.#lastSide.get(opposite) ?? -1);
    }
    return Math.max(newest, this.#unknownSegments.newest(keys));
  }
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
  /** @type {PropertyTable} */
  #table;
  /** @type {PropertyWrites} */
  #all;
  /** @type {PropertyWrites} */
  #unknownElement;
  /** @type {Map<string, PropertyWrites>} */
  #byElement = new Map();
  #lastBarrier = -1;
  // Reused by conflictsSinceIn, so a check allocates no set of its own.
  #elementScratch = /** @type {Set<string>} */ (new Set());

  /** @param {PropertyTable} table keys every declaration this index sees */
  constructor(table) {
    this.#table = table;
    this.#all = new PropertyWrites(table);
    this.#unknownElement = new PropertyWrites(table);
  }

  /**
   * @param {{prop: string}} declaration
   * @param {number} position
   * @param {readonly string[] | null} [keys] element keys of the writing rule,
   * or null when they are unknown
   */
  record(declaration, position, keys = null) {
    this.#all.record(declaration, position);
    if (keys === null) {
      this.#unknownElement.record(declaration, position);
      return;
    }
    for (const key of keys) {
      let writes = this.#byElement.get(key);
      if (!writes) {
        writes = new PropertyWrites(this.#table);
        this.#byElement.set(key, writes);
      }
      writes.record(declaration, position);
    }
  }

  /**
   * Record every write a child of the parent makes, under the element keys
   * `keysOf` gives its rule. An at-rule that is not a conditional group rule is
   * a barrier, since moving anything across it is not known to preserve the
   * cascade.
   *
   * @param {ChildNode | RuleRecord | BlockRecord} entry the node, or the record
   * of a rule or of an at-rule with a block, as a live entry of a block is
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   * @return {void}
   */
  recordNode(entry, position, keysOf) {
    this.#recordNode(entry, position, null, keysOf);
  }

  /**
   * @param {ChildNode | RuleRecord | BlockRecord} entry
   * @param {number} position
   * @param {string[] | null} keys
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  #recordNode(entry, position, keys, keysOf) {
    if (entry instanceof RuleRecord) {
      const own = keysOf(entry);
      const block = entry.block;
      if (block) {
        this.#recordBlock(block, position, own, keysOf);
        return;
      }
      // A rule without a block holds declarations and comments only.
      for (const child of entry.node.nodes)
        this.#recordNode(child, position, own, keysOf);
    } else if (entry instanceof BlockRecord) {
      // Only an at-rule has a block record among the entries.
      if (isConditionalGroupRule(/** @type {AtRule} */ (entry.node))) {
        this.#recordBlock(entry, position, keys, keysOf);
      } else {
        this.#lastBarrier = Math.max(this.#lastBarrier, position);
      }
    } else if (entry.type === 'decl') {
      this.record(entry, position, keys);
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
        for (const record of entry.rules)
          this.#recordNode(record, position, keys, keysOf);
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
   * @param {{prop: string}[]} declarations
   * @param {number} position
   * @param {Iterable<string> | null} [elements]
   * @return {boolean}
   */
  conflictsSince(declarations, position, elements = null) {
    if (this.#lastBarrier > position) return true;
    // Plain loops, so the check allocates nothing per call.
    for (const declaration of declarations) {
      if (this.#conflictsWith(declaration, position, elements)) return true;
    }
    return false;
  }

  /**
   * @param {{prop: string}} declaration
   * @param {number} position
   * @param {Iterable<string> | null} elements the element keys, or null for
   * every element
   * @return {boolean}
   */
  #conflictsWith(declaration, position, elements) {
    if (elements === null)
      return this.#all.lastConflict(declaration) > position;
    if (this.#unknownElement.lastConflict(declaration) > position) return true;
    for (const key of elements) {
      const writes = this.#byElement.get(key);
      if (writes && writes.lastConflict(declaration) > position) return true;
    }
    return false;
  }

  /**
   * `conflictsSince` for entries that move with their rules: rule records,
   * whose declarations take the keys `keysOf` gives, and bare declarations,
   * which count every write. Unknown keys count every write.
   *
   * @param {(RuleRecord | Declaration)[]} entries
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
   * @param {(RuleRecord | Declaration)[]} entries
   * @param {number} position
   * @param {Set<string> | null} elements
   * @return {boolean}
   */
  #conflictsIn(entries, position, elements) {
    if (this.#lastBarrier > position) return true;
    for (const entry of entries) {
      if (entry instanceof RuleRecord) {
        for (const declaration of entry.declarations) {
          if (this.#conflictsWith(declaration, position, elements)) return true;
        }
      } else if (this.#conflictsWith(entry, position, elements)) {
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
   * @param {(RuleRecord | Declaration)[]} entries
   * @param {number} position
   * @param {(record: RuleRecord) => string[] | null} keysOf
   */
  moveWrites(entries, position, keysOf) {
    for (const entry of entries) {
      if (entry instanceof RuleRecord) {
        // `record` only reads the keys, so the record's own list is passed as is.
        const keys = keysOf(entry);
        for (const declaration of entry.declarations) {
          this.record(declaration, position, keys?.length ? keys : null);
        }
      } else {
        this.record(entry, position, null);
      }
    }
  }
}
