/** @import {PropertyKeys} from '../../../ir/propertyTable.js' */

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
 * The latest position at which each property was declared: the answers match
 * `isConflictingProp`, in time linear in the number of longhands the property
 * expands to.
 */
export class PropertyWrites {
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

  /**
   * @param {PropertyKeys} keys the keys of a declaration's property name
   * @param {number} position
   */
  record(keys, position) {
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
   * Position of the newest write that conflicts with the property, or -1.
   *
   * @param {PropertyKeys} keys
   * @return {number}
   */
  lastConflict(keys) {
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
