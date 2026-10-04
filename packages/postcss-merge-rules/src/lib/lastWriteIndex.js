import cssnanoUtils from 'cssnano-utils';
import {
  logicalSideOf,
  longhandsOf,
  resolveProperty,
  vendorUnprefixed,
} from './propertyRelations.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {AtRule, ChildNode, Declaration} from 'postcss' */

/**
 * @typedef {{custom: true, key: string}
 *   | {custom: false, all: true}
 *   | {custom: false, all: false, name: string, known: boolean, subjectToAll: boolean, longhands: {name: string, side: string | undefined, opposite: string | undefined}[], lead: string, length: number, bare: string}} PropertyKeys
 */

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
    conditionalGroupRules.has(asciiLowerCase(node.name))
  );
}

/**
 * True if the subtree holds an at-rule whose position in the cascade is not
 * modelled, so its declarations cannot be reasoned about as plain writes.
 *
 * @param {ChildNode} node
 * @return {boolean}
 */
export function isOpaque(node) {
  if (node.type === 'atrule' && !isConditionalGroupRule(node)) return true;
  if (!('nodes' in node) || !node.nodes) return false;
  return node.nodes.some((/** @type {ChildNode} */ child) => isOpaque(child));
}

/**
 * The declarations of a rule or conditional group rule, at any depth.
 *
 * @param {ChildNode} node
 * @return {Declaration[]}
 */
export function collectDeclarations(node) {
  if (node.type === 'decl') return [node];
  if (!('nodes' in node) || !node.nodes) return [];
  return node.nodes.flatMap((/** @type {ChildNode} */ child) =>
    collectDeclarations(child)
  );
}

/** @param {{group: string, flowRelative: boolean}} side @param {boolean} flowRelative */
const sideKey = (side, flowRelative) => `${side.group}:${flowRelative}`;

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

// Keys depend only on the property name, so every index shares them. Custom
// properties are left out: their keys are trivial and their names unbounded.
/** @type {Map<string, PropertyKeys>} */
const keysCache = new Map();

/** @param {string} prop @return {PropertyKeys} */
function keysOf(prop) {
  if (prop.startsWith('--')) return { custom: true, key: prop };
  const cached = keysCache.get(prop);
  if (cached) return cached;
  const lowercased = asciiLowerCase(prop);
  /** @type {PropertyKeys} */
  let keys;
  if (lowercased === 'all') {
    keys = { custom: false, all: true };
  } else {
    const { name, known } = resolveProperty(lowercased);
    const bare = vendorUnprefixed(name);
    const segments = bare.split('-');
    keys = {
      custom: false,
      all: false,
      name,
      known,
      subjectToAll: lowercased !== 'direction' && lowercased !== 'unicode-bidi',
      longhands: known
        ? longhandsOf(name).map((longhand) => {
            const side = logicalSideOf(longhand);
            return {
              name: longhand,
              side: side && sideKey(side, side.flowRelative),
              opposite: side && sideKey(side, !side.flowRelative),
            };
          })
        : [],
      lead: segments[0],
      length: segments.length,
      bare,
    };
  }
  keysCache.set(prop, keys);
  return keys;
}

/**
 * A table of the latest position at which each property was declared among
 * the children of one parent, visited in document order. It tells whether a
 * conflicting declaration appears after a given position, in time linear in
 * the number of longhands the property expands to. The answers match
 * `isConflictingProp`; the table only computes them faster.
 *
 * Positions are chosen by the caller and increase in document order. A
 * declaration at position p does not count as appearing after p.
 */
export default class LastWriteIndex {
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
  #lastBarrier = -1;
  /**
   * @param {{prop: string}} declaration
   * @param {number} position
   */
  record(declaration, position) {
    const keys = keysOf(declaration.prop);
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
   * Record every write a child of the parent makes. An at-rule that is not a
   * conditional group rule is a barrier, since moving anything across it is
   * not known to preserve the cascade.
   *
   * @param {ChildNode} node
   * @param {number} position
   * @return {void}
   */
  recordNode(node, position) {
    if (node.type === 'decl') {
      this.record(node, position);
    } else if (node.type === 'atrule' && !isConditionalGroupRule(node)) {
      this.#lastBarrier = Math.max(this.#lastBarrier, position);
    } else if ('nodes' in node && node.nodes) {
      for (const child of node.nodes) this.recordNode(child, position);
    }
  }
  /**
   * Position of the newest write that conflicts with `declaration`, or -1.
   *
   * @param {{prop: string}} declaration
   * @return {number}
   */
  lastConflict(declaration) {
    const keys = keysOf(declaration.prop);
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

  /**
   * @param {{prop: string}[]} declarations
   * @param {number} position
   * @return {boolean}
   */
  conflictsSince(declarations, position) {
    return (
      this.#lastBarrier > position ||
      declarations.some(
        (declaration) => this.lastConflict(declaration) > position
      )
    );
  }

  /**
   * Declarations that moved to `position` are written there now. Every
   * entry only ever moves forward, so a later write to the same property
   * is kept.
   *
   * @param {{prop: string}[]} declarations
   * @param {number} position
   */
  moveWrites(declarations, position) {
    for (const declaration of declarations) this.record(declaration, position);
  }
}
