import { isCssWideKeyword } from '../isCssWideKeyword.js';
import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import hasSubstitution from '../hasSubstitution.js';
import { mergeBlockingSupport, needsUnmetSupport } from '../isFallback.js';
import minifyTrbl from '../minifyTrbl.js';
import { minifyPair, parsePair } from '../pairs.js';
import parseTrbl from '../parseTrbl.js';
import { boxProperties, shorthandSlot } from './boxGroups.js';
import { isAll } from './importanceLanes.js';
import { SlotLane, commitShorthand, flushableSlots } from './slotVector.js';

/** @import {Container, Declaration} from 'postcss'; */
/** @import {BoxFamily} from './boxGroups.js'; */

/**
 * A substitution function such as `var()` or `env()` may stand for any number
 * of tokens, so a shorthand that holds one cannot be split into its slots.
 * `hasSubstitution` also rejects a custom property, so `canExplode` skips it.
 *
 * @param {Declaration} declaration - a shorthand
 * @return {boolean}
 */
export function isExplodable(declaration) {
  return canExplode(declaration, false) && !hasSubstitution(declaration.value);
}

const trblForms = { parse: parseTrbl, minify: minifyTrbl };
const pairForms = { parse: parsePair, minify: minifyPair };

/**
 * @param {BoxFamily} family
 * @return {{ parse: (value: string) => string[], minify: (value: string | string[]) => string }}
 * how the family spreads and condenses its slots: four sides, or a start and
 * an end
 */
export function formsOf(family) {
  return family.longhands.length === 4 ? trblForms : pairForms;
}

/**
 * The values to put in the slots a later declaration overrides, so that the
 * shorthand comes out as short as it can. Only the values of the other slots
 * are candidates: they are valid for the group and add no requirement the
 * shorthand did not have. Ties go to the earliest assignment found, trying
 * the opposite slot's value first, so equal inputs give equal outputs.
 *
 * @param {string[]} values - one per slot
 * @param {boolean[]} free - whether a later declaration overrides the slot
 * @param {(value: string[]) => string} minify
 * @return {string | undefined} the shortest value, if shorter than the
 * original
 */
export function shortestWithFreeSlots(values, free, minify) {
  const freeSlots = values
    .keys()
    .filter((slot) => free[slot])
    .toArray();
  const fixed = values
    .keys()
    .filter((slot) => !free[slot])
    .toArray();
  // A shorthand with every slot overridden is dead and goes in full.
  if (freeSlots.length === 0 || fixed.length === 0) return undefined;

  let best = minify(values);
  // One token is the shortest a shorthand gets, and then every slot, the
  // fixed ones included, already holds the same value.
  if (!best.includes(' ')) return undefined;
  let improved = false;
  const trial = [...values];
  // Equal values give equal results, so each distinct value is tried once, the
  // opposite slot's first.
  const candidates = freeSlots.map((slot) => {
    const opposite = (slot + values.length / 2) % values.length;
    /** @type {string[]} */
    const distinct = free[opposite] ? [] : [values[opposite]];
    for (const source of fixed) {
      if (!distinct.includes(values[source])) distinct.push(values[source]);
    }
    return distinct;
  });

  /**
   * @param {number} position
   * @return {void}
   */
  function assign(position) {
    if (position === freeSlots.length) {
      const candidate = minify(trial);
      if (candidate.length < best.length) {
        best = candidate;
        improved = true;
      }
      return;
    }
    const slot = freeSlots[position];
    for (const value of candidates[position]) {
      trial[slot] = value;
      assign(position + 1);
    }
  }

  assign(0);
  return improved ? best : undefined;
}

/**
 * @param {BoxFamily} family
 * @param {Declaration[]} laneDecls
 * @return {number[]} for each slot, the position of the last declaration of
 * the family that sets it and that every target parses, or `-1`
 */
function lastPlainSetters(family, laneDecls) {
  const last = family.longhands.map(() => -1);
  for (const [index, declaration] of laneDecls.entries()) {
    const property = boxProperties.get(declaration.prop.toLowerCase());
    if (
      declaration.parent === undefined ||
      property?.family !== family ||
      stylehacks.detect(declaration) ||
      needsUnmetSupport(declaration)
    ) {
      continue;
    }
    if (property.slot === shorthandSlot) last.fill(index);
    else last[property.slot] = index;
  }
  return last;
}

/**
 * Rewrites the dead values of shorthands: a value a later declaration of the
 * same family overrides changes nothing in the cascade whatever it says, and
 * holds under every writing mode because both name the same physical side.
 * That frees the slot to repeat a neighbour, which lets the shorthand
 * condense, even where a declaration of the other kind keeps the later one
 * from folding into it.
 *
 * Only a declaration that every target parses overrides, since a browser that
 * drops it would otherwise fall back on the value that is rewritten.
 *
 * @param {BoxFamily} family
 * @param {Declaration[]} laneDecls
 * @param {Map<Declaration, Declaration> | undefined} inserted - the shorthand
 * a commit put after a declaration
 * @return {void}
 */
function freeOverriddenSlots(family, laneDecls, inserted) {
  const { parse, minify } = formsOf(family);
  /** @type {number[] | undefined} */
  let lastOverrider;

  for (let index = 0; index < laneDecls.length - 1; index++) {
    const anchor = laneDecls[index];
    const target = inserted?.get(anchor) ?? anchor;
    if (target.parent === undefined) continue;
    const property = boxProperties.get(target.prop.toLowerCase());
    if (
      property?.family !== family ||
      property.slot !== shorthandSlot ||
      stylehacks.detect(target) ||
      !isExplodable(target) ||
      mergeBlockingSupport(target).size > 0
    ) {
      continue;
    }

    lastOverrider ??= lastPlainSetters(family, laneDecls);
    if (lastOverrider.every((setter) => setter <= index)) continue;

    const values = parse(target.value);
    const result = shortestWithFreeSlots(
      values,
      lastOverrider.map((setter) => setter > index),
      minify
    );
    if (result !== undefined && result.length < target.value.length) {
      target.value = result;
      delete target.raws.value;
    }
  }
}

/**
 * @param {Container} rule
 * @param {BoxFamily} family
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {boolean} important
 * @param {boolean} mayInsert - whether every target supports the shorthand
 * @param {Map<Declaration, Declaration> | undefined} inserted
 * @return {void}
 */
function flush(
  rule,
  family,
  slots,
  contributing,
  fallbacks,
  important,
  mayInsert,
  inserted
) {
  const full = flushableSlots(slots);
  if (!full) return;

  const kw = isCssWideKeyword(full[0].value);
  const rawValues = full.map((s) => s.value).join(' ');
  const shorthandVal = kw ? full[0].value : formsOf(family).minify(rawValues);
  commitShorthand(rule, full, contributing, fallbacks, {
    prop: family.shorthand,
    value: shorthandVal,
    important,
    mayInsert,
    inserted,
  });
}

/**
 * Folds the declarations of one family in one importance lane into the
 * shorthand, then frees the values later declarations override.
 *
 * Folding moves a value to the position of the shorthand, so it stops at any
 * declaration that may set the same physical side: one of the other kind
 * (physical or flow-relative) in the group, or one the plugin does not
 * understand. The other axis of a flow-relative family never does. Creating
 * or growing a shorthand also needs every target to support it.
 *
 * @param {Container} rule
 * @param {BoxFamily} family
 * @param {Declaration[]} laneDecls - the group's declarations of one
 * importance, in source order
 * @param {boolean} important
 * @param {boolean} mayInsert - whether every target supports the shorthand
 * @return {void}
 */
export function reduceFamilyLane(
  rule,
  family,
  laneDecls,
  important,
  mayInsert
) {
  const count = family.longhands.length;
  /** @type {Map<Declaration, Declaration> | undefined} */
  let inserted;
  let position = 0;
  const { parse } = formsOf(family);
  const lane = new SlotLane(count, (slots, contributing, fallbacks) => {
    // Only a shorthand with a declaration after it can have a value overridden.
    if (position < laneDecls.length - 1) inserted ??= new Map();
    flush(
      rule,
      family,
      slots,
      contributing,
      fallbacks,
      important,
      mayInsert,
      inserted
    );
  });

  for (position = 0; position < laneDecls.length; position++) {
    const decl = laneDecls[position];
    const property = isAll(decl)
      ? undefined
      : boxProperties.get(decl.prop.toLowerCase());
    if (property === undefined) {
      lane.reset();
      continue;
    }
    if (property.family !== family) {
      if (property.family.kind !== family.kind) lane.reset();
      continue;
    }
    const isShort = property.slot === shorthandSlot;
    if (stylehacks.detect(decl) || (isShort && !isExplodable(decl))) {
      lane.reset();
      continue;
    }
    const wasFull = lane.begin(
      isShort ? 0 : property.slot,
      isShort ? count : 1,
      decl
    );

    const vals = isShort ? parse(decl.value) : null;
    for (let i = 0; i < count; i++) {
      if (isShort || i === property.slot) {
        lane.assign(i, vals ? vals[i] : decl.value, decl, wasFull);
      }
    }
  }
  position = laneDecls.length;
  lane.reset();

  if (laneDecls.length > 1) freeOverriddenSlots(family, laneDecls, inserted);
}
