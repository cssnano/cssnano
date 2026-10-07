import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { cssWideKeywords } from '../spec.js';
import { detach } from '../deferredChildEdits.js';
import insertCloned from '../insertCloned.js';
import isCustomProp from '../isCustomProp.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';

/** @import {Container, Declaration} from 'postcss'; */
/** @typedef {({ value: string, decl: Declaration } | null)[]} SlotVector */

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
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @return {{ value: string, decl: Declaration }[] | null} the fully-filled
 * vector, or `null` while any slot is empty or holds a custom property
 */
function slotVectorReady(slots) {
  if (slots.some((s) => !s || isCustomProp(s.decl))) return null;
  return /** @type {{ value: string, decl: Declaration }[]} */ (slots);
}

/**
 * A merged shorthand must not outlive the support requirements of any
 * declaration it represents: when one slot's support provenance differs from
 * the first, the values are not interchangeable.
 *
 * @param {{ value: string, decl: Declaration }[]} full
 * @return {boolean}
 */
function supportProvenanceMatches(full) {
  const s0 = mergeBlockingSupport(full[0].decl);
  // A shorthand fills adjacent slots with one declaration; compare it once.
  let previous = full[0].decl;
  for (let i = 1; i < full.length; i++) {
    const decl = full[i].decl;
    if (decl === previous) continue;
    previous = decl;
    if (s0.symmetricDifference(mergeBlockingSupport(decl)).size) {
      return false;
    }
  }
  return true;
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @return {{ value: string, decl: Declaration }[] | null} the fully-filled
 * vector ready to be merged, or `null` if any slot is missing, custom,
 * conflicting on CSS-wide keywords, or has mismatched support provenance
 */
export function flushableSlots(slots) {
  const full = slotVectorReady(slots);
  if (!full) return null;

  const v0 = full[0].value.toLowerCase();
  const kw = cssWideKeywords.has(v0);
  for (const s of full) {
    const sv = s.value.toLowerCase();
    if (kw ? sv !== v0 : cssWideKeywords.has(sv)) return null;
  }
  if (!supportProvenanceMatches(full)) return null;

  return full;
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx
 * @param {string} value
 * @param {Declaration} decl
 * @param {Set<Declaration>} fallbacks
 * @param {boolean} [fallbackSettled] the caller already found, through
 * `shouldResetSlots`, that the slot's declaration is no fallback for `decl`
 */
function assignSlotValue(
  slots,
  idx,
  value,
  decl,
  fallbacks,
  fallbackSettled = false
) {
  const existing = slots[idx];
  if (!fallbackSettled && existing && isFallback(existing.decl, decl)) {
    fallbacks.add(existing.decl);
  }
  slots[idx] = { value, decl };
}

/**
 * A new declaration flushes the vector when it would overwrite a slot whose
 * declaration a later declaration may need as a fallback, or when a CSS-wide
 * keyword resets every slot it touches. Only a fully-filled vector can need
 * this; callers check that first.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} first - the first slot the declaration writes
 * @param {number} count - how many consecutive slots it writes; all slots for
 * a shorthand
 * @param {Declaration} decl
 * @return {boolean}
 */
function shouldResetSlots(slots, first, count, decl) {
  if (count < slots.length && isCssWideKeyword(decl.value)) {
    return true;
  }
  for (let i = first; i < first + count; i++) {
    if (
      isFallback(/** @type {{ decl: Declaration }} */ (slots[i]).decl, decl)
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
  /**
   * @param {number} size - how many slots the family has
   * @param {(slots: SlotVector, contributing: Set<Declaration>, fallbacks: Set<Declaration>) => void} commit
   * called with the state whenever the run ends, before it is cleared
   */
  constructor(size, commit) {
    /** @type {SlotVector} */
    this.slots = Array.from({ length: size }, () => null);
    /** @type {Set<Declaration>} */
    this.contributing = new Set();
    /** @type {Set<Declaration>} */
    this.fallbacks = new Set();
    this.commit = commit;
  }

  /** Commits the run, then starts an empty one. */
  reset() {
    this.commit(this.slots, this.contributing, this.fallbacks);
    this.slots.fill(null);
    this.contributing.clear();
    this.fallbacks.clear();
  }

  /**
   * Flushes the run if `decl` would invalidate it, before it writes `count`
   * slots from `first` on.
   *
   * @param {number} first
   * @param {number} count
   * @param {Declaration} decl
   * @return {boolean} whether the vector was full beforehand, to pass to `assign`
   */
  begin(first, count, decl) {
    const wasFull = this.slots.every(Boolean);
    if (wasFull && shouldResetSlots(this.slots, first, count, decl)) {
      this.reset();
    }
    return wasFull;
  }

  /**
   * @param {number} idx
   * @param {string} value
   * @param {Declaration} decl
   * @param {boolean} wasFull - as returned by `begin`
   */
  assign(idx, value, decl, wasFull) {
    assignSlotValue(this.slots, idx, value, decl, this.fallbacks, wasFull);
    this.contributing.add(decl);
  }
}

/**
 * Commits a fully-filled slot vector when its shorthand wins the byte-cost
 * comparison: a lone same-property declaration is rewritten in place, and a
 * profitable cover is inserted after the final represented declaration while
 * the represented, non-fallback declarations are removed.
 *
 * @param {Container} rule
 * @param {{ value: string, decl: Declaration }[]} full
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {{ prop: string, value: string, important: boolean, inserted?: Map<Declaration, Declaration>, mayInsert?: boolean }} target
 * `mayInsert: false` limits the commit to the in-place rewrite, for a
 * shorthand that some target does not support.
 */
export function commitShorthand(rule, full, contributing, fallbacks, target) {
  const { prop, value: shorthandVal, important } = target;
  const toRemove = Array.from(contributing).filter((d) => !fallbacks.has(d));
  if (toRemove.length === 0) return;

  if (toRemove.length === 1 && toRemove[0].prop.toLowerCase() === prop) {
    toRemove[0].prop = prop;
    toRemove[0].value = shorthandVal;
    delete toRemove[0].raws?.value;
    return;
  }
  if (target.mayInsert === false) return;

  let remSize = -declCost(prop, shorthandVal, important);
  for (const d of toRemove) {
    remSize += declCost(d.prop, d.value, d.important);
  }

  if (remSize >= 0) {
    const a = toRemove.at(-1);
    if (!a) return;
    const inserted = insertCloned(rule, a, {
      prop,
      value: shorthandVal,
      important,
    });
    if (target.inserted) target.inserted.set(a, inserted);
    for (const d of toRemove) detach(d);
  }
}
