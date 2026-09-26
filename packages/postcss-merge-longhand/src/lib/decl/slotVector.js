import insertCloned from '../insertCloned.js';
import isCustomProp from '../isCustomProp.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';

/** @import {Container, Declaration} from 'postcss'; */

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
export function slotVectorReady(slots) {
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
export function supportProvenanceMatches(full) {
  const s0 = mergeBlockingSupport(full[0].decl);
  for (const s of full) {
    if (s0.symmetricDifference(mergeBlockingSupport(s.decl)).size) {
      return false;
    }
  }
  return true;
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx
 * @param {string} value
 * @param {Declaration} decl
 * @param {Set<Declaration>} fallbacks
 */
export function assignSlotValue(slots, idx, value, decl, fallbacks) {
  const existing = slots[idx];
  if (existing && isFallback(existing.decl, decl)) {
    fallbacks.add(existing.decl);
  }
  slots[idx] = { value, decl };
}

/**
 * A new declaration flushes the vector when it would overwrite a slot whose
 * declaration a later declaration may need as a fallback, or when a CSS-wide
 * keyword resets every slot it touches.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx - the slot the declaration writes, or -1 for a shorthand
 * @param {Declaration} decl
 * @return {boolean}
 */
export function shouldResetSlots(slots, idx, decl) {
  if (!slots.every(Boolean)) return false;
  const isFb = (/** @type {{decl: Declaration} | null} */ s) =>
    Boolean(s && isFallback(s.decl, decl));
  if (idx === -1) return slots.some(isFb);
  return cssGlobalKeywords.has(decl.value.toLowerCase()) || isFb(slots[idx]);
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
 * @param {{ prop: string, value: string, important: boolean, inserted?: Map<Declaration, Declaration> }} target
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
    for (const d of toRemove) d.remove();
  }
}
