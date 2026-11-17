/** @import {PropertyKeys} from './propertyTable.js' */

/** @param {Map<string | number, number>} map @param {string | number} key @param {number} position */
function raise(map, key, position) {
  if ((map.get(key) ?? -1) < position) map.set(key, position);
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
  #lastLonghand = new Map();
  // Per logical property group, one position for physical writes and one for
  // flow-relative writes: only members on opposite sides can address the same
  // side of the box.
  /** @type {Map<string | number, number>} */
  #lastSide = new Map();
  #lastAll = -1;
  // Newest write that `all` resets: #everything except `direction`,
  // `unicode-bidi` and custom properties.
  #lastResettable = -1;
  // Newest write of any property but a custom one, which an unknown property
  // conflicts with, and newest write of an unknown property, which every
  // property conflicts with.
  #lastAny = -1;
  #lastUnknown = -1;

  /**
   * @param {PropertyKeys} keys the keys of a declaration's property name
   * @param {number} position
   */
  record(keys, position) {
    if (keys.custom) {
      raise(this.#lastCustom, keys.key, position);
      return;
    }
    this.#lastAny = Math.max(this.#lastAny, position);
    if (keys.all) {
      this.#lastAll = Math.max(this.#lastAll, position);
      this.#lastResettable = Math.max(this.#lastResettable, position);
      return;
    }
    if (keys.subjectToAll) {
      this.#lastResettable = Math.max(this.#lastResettable, position);
    }
    if (!keys.known) this.#lastUnknown = Math.max(this.#lastUnknown, position);
    for (const { name, side } of keys.longhands) {
      raise(this.#lastLonghand, name, position);
      if (side) raise(this.#lastSide, side, position);
    }
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
    if (!keys.known) return this.#lastAny;
    let newest = keys.subjectToAll ? this.#lastAll : -1;
    for (const { name, opposite } of keys.longhands) {
      newest = Math.max(newest, this.#lastLonghand.get(name) ?? -1);
      if (opposite)
        newest = Math.max(newest, this.#lastSide.get(opposite) ?? -1);
    }
    return Math.max(newest, this.#lastUnknown);
  }
}
