import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { cssWideKeywords } from '../spec.js';
import { detach } from '../../deferredChildEdits.js';
import insertCloned from '../insertCloned.js';
import isCustomProp from '../isCustomProp.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */
/** @import {RangePiece} from '../../../../../values/joinRanges.js'; */
/**
 * @typedef {({ value: string, decl: Declaration, range?: RangePiece } | null)[]} SlotVector
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
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @return {{ value: string, decl: Declaration }[] | null} the fully-filled
 * vector, or `null` while any slot is empty or holds a custom property
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function slotVectorReady(slots, textTable) {
  if (slots.some((s) => !s || isCustomProp(s.decl, textTable))) return null;
  return /** @type {{ value: string, decl: Declaration }[]} */ (slots);
}

/**
 * A merged shorthand must not outlive the support requirements of any
 * declaration it represents: when one slot's support provenance differs from
 * the first, the values are not interchangeable.
 *
 * @param {{ value: string, decl: Declaration }[]} full
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @return {boolean}
 */
function supportProvenanceMatches(full, textTable) {
  const s0 = mergeBlockingSupport(full[0].decl, textTable);
  // A shorthand fills adjacent slots with one declaration; compare it once.
  let previous = full[0].decl;
  for (let i = 1; i < full.length; i++) {
    const decl = full[i].decl;
    if (decl === previous) continue;
    previous = decl;
    if (s0.symmetricDifference(mergeBlockingSupport(decl, textTable)).size) {
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
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
export function flushableSlots(slots, textTable) {
  const full = slotVectorReady(slots, textTable);
  if (!full) return null;

  const v0 = asciiLowerCase(full[0].value);
  const kw = cssWideKeywords.has(v0);
  for (const s of full) {
    const sv = asciiLowerCase(s.value);
    if (kw ? sv !== v0 : cssWideKeywords.has(sv)) return null;
  }
  if (!supportProvenanceMatches(full, textTable)) return null;

  return full;
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
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @return {boolean}
 */
function shouldResetSlots(slots, first, count, decl, textTable) {
  if (count < slots.length && isCssWideKeyword(decl.value)) {
    return true;
  }
  for (let i = first; i < first + count; i++) {
    if (
      isFallback(
        /** @type {{ decl: Declaration }} */ (slots[i]).decl,
        decl,
        textTable
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
  /** @type {import('../../../../../values/textTable.js').TextTable} */
  #textTable;

  /**
   * @param {number} size - how many slots the family has
   * @param {(slots: SlotVector, contributing: Set<Declaration>, fallbacks: Set<Declaration>) => void} commit
   * called with the state whenever the run ends, before it is cleared
   * @param {import('../../../../../values/textTable.js').TextTable} textTable
   */
  constructor(size, commit, textTable) {
    this.#textTable = textTable;
    /** @type {SlotVector} */
    this.slots = Array.from({ length: size }, () => null);
    /** @type {Set<Declaration>} */
    this.contributing = new Set();
    /** @type {Set<Declaration>} */
    this.fallbacks = new Set();
    /**
     * The fallbacks behind each slot's declaration, allocated with the first.
     *
     * @type {(Declaration[] | undefined)[] | undefined}
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
   * @param {Declaration} decl
   * @return {boolean} whether the vector was full beforehand, to pass to `assign`
   */
  begin(first, count, decl) {
    const wasFull = this.slots.every(Boolean);
    if (
      wasFull &&
      shouldResetSlots(this.slots, first, count, decl, this.#textTable)
    ) {
      this.reset();
    }
    return wasFull;
  }

  /**
   * @param {number} idx
   * @param {string} value
   * @param {Declaration} decl
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
   * @param {Declaration} previous - the declaration `decl` overwrites
   * @param {Declaration} decl
   * @param {boolean} fallbackSettled - the caller already found, through
   * `shouldResetSlots`, that `previous` is no fallback for `decl`
   * @return {void}
   */
  #retainFallbacks(idx, previous, decl, fallbackSettled) {
    const behind = this.slotFallbacks?.[idx];
    const isPreviousFallback =
      !fallbackSettled && isFallback(previous, decl, this.#textTable);
    if (behind === undefined && !isPreviousFallback) return;
    const kept =
      behind?.filter((d) => isFallback(d, decl, this.#textTable)) ?? [];
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
    for (const list of this.slotFallbacks) {
      if (list === undefined) continue;
      for (const d of list) this.fallbacks.add(d);
    }
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
 * `mayInsert: false` limits the commit to the in-place rewrite, for a shorthand
 * that some target does not support.
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @returns {Declaration | undefined} the declaration that now spells the
 * shorthand, or undefined when nothing was written
 */
export function commitShorthand(
  rule,
  full,
  contributing,
  fallbacks,
  target,
  textTable
) {
  const { prop, value: shorthandVal, important } = target;
  const toRemove = Array.from(contributing).filter((d) => !fallbacks.has(d));
  if (toRemove.length === 0) return undefined;

  if (toRemove.length === 1 && asciiLowerCase(toRemove[0].prop) === prop) {
    toRemove[0].prop = prop;
    textTable.setText(toRemove[0], shorthandVal);
    return toRemove[0];
  }
  if (target.mayInsert === false) return undefined;

  let remSize = -declCost(prop, shorthandVal, important);
  for (const d of toRemove) {
    remSize += declCost(d.prop, d.value, d.important);
  }

  if (remSize < 0) return undefined;
  const a = toRemove.at(-1);
  if (!a) return undefined;
  const inserted = insertCloned(
    rule,
    a,
    { prop, value: shorthandVal, important },
    textTable
  );
  if (target.inserted) target.inserted.set(a, inserted);
  for (const d of toRemove) detach(d);
  return inserted;
}
