/** @import {PropertyKeys} from './propertyTable.js' */

/**
 * The positions one claimer has claimed, and the cursor it holds in each list
 * it reads. Claims only grow, so a cursor moves forward once. A new claimer
 * holds no cursors, so it starts every list from its first position.
 */
export class Claims {
  /** @type {Set<number>} the positions claimed so far */
  claimed = new Set();
  /** @type {Map<number[], number>} the position each list's cursor is at */
  cursors = new Map();
}

/**
 * @param {number[]} positions
 * @param {number} position greater than every position recorded so far
 */
function appendToList(positions, position) {
  if (positions[positions.length - 1] !== position) positions.push(position);
}

/**
 * @param {Map<string | number, number[]>} lists
 * @param {string | number} key
 * @param {number} position greater than every position recorded so far
 */
function appendPosition(lists, key, position) {
  let positions = lists.get(key);
  if (!positions) {
    positions = [];
    lists.set(key, positions);
  }
  appendToList(positions, position);
}

/**
 * @param {number[] | undefined} positions the ascending positions of one list
 * @param {Claims} claims
 * @return {number} the first position of the list not claimed, or -1
 */
function firstUnclaimedIn(positions, claims) {
  if (!positions) return -1;
  const { claimed, cursors } = claims;
  let cursor = cursors.get(positions) ?? 0;
  while (cursor < positions.length && claimed.has(positions[cursor])) {
    cursor++;
  }
  cursors.set(positions, cursor);
  return cursor < positions.length ? positions[cursor] : -1;
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number} the smaller of two positions, where -1 stands for none
 */
function earliest(a, b) {
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

/**
 * The position of every write, grouped by the keys `PropertyWrites` uses, so
 * the earliest unclaimed conflicting write is read from the lists those keys
 * name. Claims only grow between queries on one index, which lets each cursor
 * move forward once. A query for `all` throws, so callers reject it first.
 */
export class WritePositions {
  /** @type {Map<string | number, number[]>} */
  #customs = new Map();
  /** @type {number[]} */
  #all = [];
  /** @type {number[]} every write but a custom one, as `PropertyWrites` keeps them */
  #any = [];
  /** @type {number[]} the writes of unknown properties */
  #unknown = [];
  /** @type {Map<string | number, number[]>} */
  #longhands = new Map();
  /** @type {Map<string | number, number[]>} */
  #sides = new Map();

  /**
   * @param {PropertyKeys} keys the keys of a declaration's property name
   * @param {number} position greater than every position recorded so far
   */
  record(keys, position) {
    if (keys.custom) {
      appendPosition(this.#customs, keys.key, position);
      return;
    }
    appendToList(this.#any, position);
    if (keys.all) {
      appendToList(this.#all, position);
      return;
    }
    if (!keys.known) appendToList(this.#unknown, position);
    for (const { name, side } of keys.longhands) {
      appendPosition(this.#longhands, name, position);
      if (side) appendPosition(this.#sides, side, position);
    }
  }

  /**
   * The earliest unclaimed position of a write that conflicts with
   * `declaration`, or -1. Its keys are those `PropertyWrites.lastConflict`
   * reads.
   *
   * @param {PropertyKeys} keys of a property that is not `all`
   * @param {Claims} claims the claimer's positions and cursors
   * @return {number}
   */
  firstUnclaimed(keys, claims) {
    if (keys.custom) {
      return firstUnclaimedIn(this.#customs.get(keys.key), claims);
    }
    if (keys.all) {
      throw new RangeError('firstUnclaimed takes no all declaration');
    }
    if (!keys.known) return firstUnclaimedIn(this.#any, claims);
    let first = keys.subjectToAll ? firstUnclaimedIn(this.#all, claims) : -1;
    for (const { name, opposite } of keys.longhands) {
      first = earliest(
        first,
        firstUnclaimedIn(this.#longhands.get(name), claims)
      );
      if (opposite) {
        first = earliest(
          first,
          firstUnclaimedIn(this.#sides.get(opposite), claims)
        );
      }
    }
    return earliest(first, firstUnclaimedIn(this.#unknown, claims));
  }
}
