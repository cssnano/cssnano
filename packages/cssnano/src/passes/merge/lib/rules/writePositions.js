/** @import {PropertyTable} from '../../../ir/propertyTable.js' */

/**
 * The ascending positions at which one key was written, with a cursor past
 * the positions already claimed. While claims only grow, a cursor moves forward
 * once and the total work is linear in the positions recorded. The list
 * remembers the set and size its cursor was advanced under, so a different or
 * smaller set restarts the cursor instead of skipping positions.
 *
 * @typedef {{positions: number[], cursor: number, claimed?: Set<number>, claimedSize: number}} PositionList
 */

/**
 * @param {PositionList} list
 * @param {number} position greater than every position recorded so far
 */
function appendToList(list, position) {
  const { positions } = list;
  if (positions[positions.length - 1] !== position) positions.push(position);
}

/**
 * @param {Map<string | number, PositionList>} lists
 * @param {string | number} key
 * @param {number} position greater than every position recorded so far
 */
function appendPosition(lists, key, position) {
  let list = lists.get(key);
  if (!list) {
    list = { positions: [], cursor: 0, claimedSize: 0 };
    lists.set(key, list);
  }
  appendToList(list, position);
}

/**
 * @param {PositionList | undefined} list
 * @param {Set<number>} claimed
 * @return {number} the first position of `list` not claimed, or -1
 */
function firstUnclaimedIn(list, claimed) {
  if (!list) return -1;
  const { positions } = list;
  if (list.claimed !== claimed || claimed.size < list.claimedSize) {
    list.cursor = 0;
    list.claimed = claimed;
  }
  list.claimedSize = claimed.size;
  while (
    list.cursor < positions.length &&
    claimed.has(positions[list.cursor])
  ) {
    list.cursor++;
  }
  return list.cursor < positions.length ? positions[list.cursor] : -1;
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
 * The positions of the writes that `SegmentIndex` groups, in the same groups,
 * so `firstUnclaimed` reads the lists `SegmentIndex.newest` reads.
 */
class SegmentPositions {
  /** @type {Map<string, {lengths: Map<number, PositionList>, names: Map<string, PositionList>}>} */
  #byLead = new Map();
  /** @type {{lengths: Map<number, PositionList>, names: Map<string, PositionList>}} */
  #everything = { lengths: new Map(), names: new Map() };

  /**
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
      appendPosition(group.lengths, length, position);
      appendPosition(group.names, bare, position);
    }
  }

  /**
   * The earliest unclaimed position of a related property, or -1. Groups are
   * chosen as `SegmentIndex.newest` chooses them.
   *
   * @param {{lead: string, length: number, bare: string}} keys
   * @param {Set<number>} claimed
   * @return {number}
   */
  firstUnclaimed({ lead, length, bare }, claimed) {
    const groups =
      lead === 'place'
        ? [this.#everything]
        : [this.#byLead.get(lead), this.#byLead.get('place')];
    let first = -1;
    for (const group of groups) {
      if (!group) continue;
      first = earliest(first, firstUnclaimedIn(group.names.get(bare), claimed));
      for (const [recordedLength, list] of group.lengths) {
        if (recordedLength !== length) {
          first = earliest(first, firstUnclaimedIn(list, claimed));
        }
      }
    }
    return first;
  }
}

/**
 * The position of every write, grouped by the keys `PropertyWrites` uses, so
 * the earliest unclaimed conflicting write is read from the lists those keys
 * name. Claims only grow between queries on one index, which lets each cursor
 * move forward once. A query for `all` throws, so callers reject it first.
 */
export class WritePositions {
  /** @type {PropertyTable} */
  #table;
  /** @type {Map<string | number, PositionList>} */
  #customs = new Map();
  /** @type {PositionList} */
  #all = { positions: [], cursor: 0, claimedSize: 0 };
  /** @type {Map<string | number, PositionList>} */
  #names = new Map();
  /** @type {Map<string | number, PositionList>} */
  #longhands = new Map();
  /** @type {Map<string | number, PositionList>} */
  #sides = new Map();
  #anySegments = new SegmentPositions();
  #unknownSegments = new SegmentPositions();

  /** @param {PropertyTable} table keys every declaration this index sees */
  constructor(table) {
    this.#table = table;
  }

  /**
   * @param {{prop: string}} declaration
   * @param {number} position greater than every position recorded so far
   */
  record(declaration, position) {
    const keys = this.#table.keysOf(declaration.prop);
    if (keys.custom) {
      appendPosition(this.#customs, keys.key, position);
      return;
    }
    if (keys.all) {
      appendToList(this.#all, position);
      return;
    }
    appendPosition(this.#names, keys.name, position);
    for (const { name, side } of keys.longhands) {
      appendPosition(this.#longhands, name, position);
      if (side) appendPosition(this.#sides, side, position);
    }
    this.#anySegments.record(keys, position);
    if (!keys.known) this.#unknownSegments.record(keys, position);
  }

  /**
   * The earliest unclaimed position of a write that conflicts with
   * `declaration`, or -1. Its keys are those `PropertyWrites.lastConflict`
   * reads.
   *
   * @param {{prop: string}} declaration not `all`
   * @param {Set<number>} claimed
   * @return {number}
   */
  firstUnclaimed(declaration, claimed) {
    const keys = this.#table.keysOf(declaration.prop);
    if (keys.custom) {
      return firstUnclaimedIn(this.#customs.get(keys.key), claimed);
    }
    if (keys.all) {
      throw new RangeError('firstUnclaimed takes no all declaration');
    }
    let first = earliest(
      firstUnclaimedIn(this.#names.get(keys.name), claimed),
      keys.subjectToAll ? firstUnclaimedIn(this.#all, claimed) : -1
    );
    if (!keys.known) {
      return earliest(first, this.#anySegments.firstUnclaimed(keys, claimed));
    }
    for (const { name, opposite } of keys.longhands) {
      first = earliest(
        first,
        firstUnclaimedIn(this.#longhands.get(name), claimed)
      );
      if (opposite) {
        first = earliest(
          first,
          firstUnclaimedIn(this.#sides.get(opposite), claimed)
        );
      }
    }
    return earliest(first, this.#unknownSegments.firstUnclaimed(keys, claimed));
  }
}
