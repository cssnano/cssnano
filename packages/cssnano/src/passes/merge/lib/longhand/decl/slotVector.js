import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { cssWideKeywords } from '../spec.js';
import isCustomProp from '../isCustomProp.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {BlockDeclarations} from '../blockDeclarations.js'; */
/** @import {RangePiece} from '../../../../../values/joinRanges.js'; */
/**
 * @typedef {({ value: string, decl: number, range?: RangePiece } | null)[]} SlotVector
 * `range` holds the tokens that spell `value`, when the reducer keeps them.
 */

/* An emitted `!important` costs ten bytes more than the `:`/`;` separators
 * already counted for a normal declaration. */
const importantCost = 10;

/**
 * Byte cost of one emitted declaration: the property and value text, the `:`
 * separator and terminating `;`, and the `!important` annotation.
 *
 * @param {string} prop
 * @param {string} value
 * @param {boolean} [important]
 * @return {number}
 */
export function declCost(prop, value, important) {
  return prop.length + value.length + 2 + (important ? importantCost : 0);
}

/**
 * The slot-lane reducers (border-radius, columns, margin/padding) all keep a
 * vector of `{ value, decl }` slots, a set of contributing declarations and a
 * set of declarations preserved as fallbacks. This module carries the parts of
 * that bookkeeping that are identical across the families: slot assignment
 * with fallback registration, the reset predicate, the support-provenance
 * check, and the commit step that rewrites or emits the merged shorthand.
 *
 * Family-specific judgment stays with each reducer: how a value is parsed and
 * minified, which values are CSS-wide keywords, and which properties a
 * shorthand names.
 */

/**
 * @param {({ value: string, decl: number } | null)[]} slots
 * @param {BlockDeclarations} list
 * @return {{ value: string, decl: number }[] | null} the fully-filled
 * vector, or `null` while any slot is empty or holds a custom property
 */
function slotVectorReady(slots, list) {
  if (slots.some((s) => !s || isCustomProp(list.at(s.decl)))) return null;
  return /** @type {{ value: string, decl: number }[]} */ (slots);
}

/**
 * A merged shorthand must not outlive the support requirements of any
 * declaration it represents: when one slot's support provenance differs from
 * the first, the values are not interchangeable.
 *
 * @param {{ value: string, decl: number }[]} full
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
function supportProvenanceMatches(full, list, features) {
  const s0 = mergeBlockingSupport(list.at(full[0].decl), features);
  // A shorthand fills adjacent slots with one declaration; compare it once.
  let previous = full[0].decl;
  for (let i = 1; i < full.length; i++) {
    const decl = full[i].decl;
    if (decl === previous) continue;
    previous = decl;
    if (
      s0.symmetricDifference(mergeBlockingSupport(list.at(decl), features)).size
    ) {
      return false;
    }
  }
  return true;
}

/**
 * @param {({ value: string, decl: number } | null)[]} slots
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {{ value: string, decl: number }[] | null} the fully-filled
 * vector ready to be merged, or `null` if any slot is missing, custom,
 * conflicting on CSS-wide keywords, or has mismatched support provenance
 */
export function flushableSlots(slots, list, features) {
  const full = slotVectorReady(slots, list);
  if (!full) return null;

  const v0 = asciiLowerCase(full[0].value);
  const kw = cssWideKeywords.has(v0);
  for (const s of full) {
    const sv = asciiLowerCase(s.value);
    if (kw ? sv !== v0 : cssWideKeywords.has(sv)) return null;
  }
  if (!supportProvenanceMatches(full, list, features)) return null;

  return full;
}

/**
 * A new declaration flushes the vector when it would overwrite a slot whose
 * declaration a later declaration may need as a fallback, or when a CSS-wide
 * keyword resets every slot it touches. Only a fully-filled vector can need
 * this; callers check that first.
 *
 * @param {({ value: string, decl: number } | null)[]} slots
 * @param {number} first - the first slot the declaration writes
 * @param {number} count - how many consecutive slots it writes; all slots for
 * a shorthand
 * @param {number} position - the declaration's position in `list`
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
function shouldResetSlots(slots, first, count, position, list, features) {
  const decl = list.at(position);
  if (count < slots.length && isCssWideKeyword(decl.value)) {
    return true;
  }
  for (let i = first; i < first + count; i++) {
    if (
      isFallback(
        list.at(/** @type {{ decl: number }} */ (slots[i]).decl),
        decl,
        features
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The state of one importance lane of a slot-lane reducer: the slot vector, the
 * declarations that contribute to it and the ones kept as fallbacks. A reducer
 * walks its declarations, calls `begin` before writing slots, `assign` for each
 * slot and `reset` wherever a declaration ends the run.
 */
export class SlotLane {
  /** @type {BlockDeclarations} */
  #list;
  /** @type {ReadonlySet<string>} */
  #features;

  /**
   * @param {number} size - how many slots the family has
   * @param {(slots: SlotVector, contributing: Set<number>, fallbacks: Set<number>) => void} commit
   * called with the state whenever the run ends, before it is cleared
   * @param {BlockDeclarations} list
   * @param {ReadonlySet<string>} features the features every target supports
   */
  constructor(size, commit, list, features) {
    this.#list = list;
    this.#features = features;
    /** @type {SlotVector} */
    this.slots = Array.from({ length: size }, () => null);
    /** @type {Set<number>} */
    this.contributing = new Set();
    /** @type {Set<number>} */
    this.fallbacks = new Set();
    /**
     * The fallbacks behind each slot's declaration, allocated with the first.
     *
     * @type {(number[] | undefined)[] | undefined}
     */
    this.slotFallbacks = undefined;
    this.commit = commit;
  }

  /** Commits the run, then starts an empty one. */
  reset() {
    this.commit(this.slots, this.contributing, this.fallbacks);
    this.slots.fill(null);
    this.contributing.clear();
    this.fallbacks.clear();
    this.slotFallbacks = undefined;
  }

  /**
   * Flushes the run if `decl` would invalidate it, before it writes `count`
   * slots from `first` on.
   *
   * @param {number} first
   * @param {number} count
   * @param {number} decl - the declaration's position in the list
   * @return {boolean} whether the vector was full beforehand, to pass to `assign`
   */
  begin(first, count, decl) {
    const wasFull = this.slots.every(Boolean);
    if (
      wasFull &&
      shouldResetSlots(
        this.slots,
        first,
        count,
        decl,
        this.#list,
        this.#features
      )
    ) {
      this.reset();
    }
    return wasFull;
  }

  /**
   * @param {number} idx
   * @param {string} value
   * @param {number} decl - the declaration's position in the list
   * @param {boolean} wasFull - as returned by `begin`
   * @param {RangePiece} [range] the tokens that spell `value`, when kept
   */
  assign(idx, value, decl, wasFull, range) {
    const existing = this.slots[idx];
    if (existing) this.#retainFallbacks(idx, existing.decl, decl, wasFull);
    this.slots[idx] =
      range === undefined ? { value, decl } : { value, decl, range };
    this.contributing.add(decl);
  }

  /**
   * A fallback matters only while a browser may drop every declaration after
   * it in the slot. Once `decl` takes the slot, an earlier declaration stays a
   * fallback only if it is one for `decl`, since wherever it applies, so does
   * `decl`.
   *
   * @param {number} idx
   * @param {number} previous - the declaration `decl` overwrites
   * @param {number} decl
   * @param {boolean} fallbackSettled - the caller already found, through
   * `shouldResetSlots`, that `previous` is no fallback for `decl`
   * @return {void}
   */
  #retainFallbacks(idx, previous, decl, fallbackSettled) {
    const list = this.#list;
    const later = list.at(decl);
    const behind = this.slotFallbacks?.[idx];
    const isPreviousFallback =
      !fallbackSettled && isFallback(list.at(previous), later, this.#features);
    if (behind === undefined && !isPreviousFallback) return;
    const kept =
      behind?.filter((d) => isFallback(list.at(d), later, this.#features)) ??
      [];
    const pruned = behind !== undefined && kept.length < behind.length;
    if (isPreviousFallback) {
      kept.push(previous);
      this.fallbacks.add(previous);
    }
    this.slotFallbacks ??= this.slots.map(() => undefined);
    this.slotFallbacks[idx] = kept;
    if (!pruned) return;
    // A shorthand can be a fallback in several slots.
    this.fallbacks.clear();
    for (const slotKept of this.slotFallbacks) {
      if (slotKept === undefined) continue;
      for (const d of slotKept) this.fallbacks.add(d);
    }
  }
}

/**
 * Commits a fully-filled slot vector when its shorthand wins the byte-cost
 * comparison: a lone same-property declaration is rewritten in place, and a
 * profitable cover is inserted after the final represented declaration while
 * the represented, non-fallback declarations are removed.
 *
 * @param {BlockDeclarations} list
 * @param {{ value: string, decl: number }[]} full
 * @param {Set<number>} contributing
 * @param {Set<number>} fallbacks
 * @param {{ prop: string, value: string, important: boolean, inserted?: Map<number, number>, mayInsert?: boolean }} target
 * `mayInsert: false` limits the commit to the in-place rewrite, for a shorthand
 * that some target does not support.
 * @returns {number | undefined} the declaration that now spells the
 * shorthand, or undefined when nothing was written
 */
export function commitShorthand(list, full, contributing, fallbacks, target) {
  const { prop, value: shorthandVal, important } = target;
  const toRemove = Array.from(contributing).filter((d) => !fallbacks.has(d));
  if (toRemove.length === 0) return undefined;

  const first = list.at(toRemove[0]);
  if (toRemove.length === 1 && asciiLowerCase(first.prop) === prop) {
    list.rewrite(toRemove[0], prop, shorthandVal);
    return toRemove[0];
  }
  if (target.mayInsert === false) return undefined;

  let remSize = -declCost(prop, shorthandVal, important);
  for (const d of toRemove) {
    const item = list.at(d);
    remSize += declCost(item.prop, item.value, item.important);
  }

  if (remSize < 0) return undefined;
  const a = toRemove.at(-1);
  if (a === undefined) return undefined;
  const inserted = list.insertClone(a, {
    prop,
    value: shorthandVal,
    important,
  });
  if (target.inserted) target.inserted.set(a, inserted);
  for (const d of toRemove) list.remove(d);
  return inserted;
}
