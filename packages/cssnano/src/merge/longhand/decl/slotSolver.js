import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { hasHack } from '#stylehacks';
import canExplode from '../canExplode.js';
import hasSubstitution from '../hasSubstitution.js';
import { componentTexts, declarationTokens } from '../componentRanges.js';
import { mergeBlockingSupport, needsUnmetSupport } from '../isFallback.js';
import minifyTrbl from '../minifyTrbl.js';
import { minifyPair, parsePair } from '../pairs.js';
import parseTrbl from '../parseTrbl.js';
import { boxProperties, shorthandSlot } from './boxGroups.js';
import { isAll } from './importanceLanes.js';
import { SlotLane, commitShorthand, flushableSlots } from './slotVector.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js'; */
/** @import {BoxFamily} from './boxGroups.js'; */

/**
 * A substitution function such as `var()` or `env()` may stand for any number
 * of tokens, so a shorthand that holds one cannot be split into its slots.
 * `hasSubstitution` also rejects a custom property, so `canExplode` skips it.
 *
 * @param {DeclarationItem} declaration - a shorthand
 * @return {boolean}
 */
export function isExplodable(declaration) {
  return (
    canExplode(declaration, false) &&
    !hasSubstitution(declaration.value, declarationTokens(declaration))
  );
}

const trblForms = { parse: parseTrbl, minify: minifyTrbl };
const pairForms = { parse: parsePair, minify: minifyPair };

/**
 * @param {BoxFamily} family
 * @return {{ parse: (value: string | string[]) => string[], minify: (value: string | string[]) => string }}
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

  const best = minify(values);
  // One token is the shortest a shorthand gets, and then every slot, the
  // fixed ones included, already holds the same value.
  if (!best.includes(' ')) return undefined;
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

  const search = new FreeSlotSearch(
    values,
    freeSlots,
    candidates,
    minify,
    best
  );
  search.assign(0);
  return search.improved ? search.best : undefined;
}

/** The depth-first search over the values the free slots may take. */
class FreeSlotSearch {
  /**
   * @param {readonly string[]} values
   * @param {readonly number[]} freeSlots
   * @param {readonly string[][]} candidates the values to try, by free slot
   * @param {(values: string[]) => string} minify
   * @param {string} best the form to beat
   */
  constructor(values, freeSlots, candidates, minify, best) {
    this.trial = [...values];
    this.freeSlots = freeSlots;
    this.candidates = candidates;
    this.minify = minify;
    this.best = best;
    this.improved = false;
  }

  /**
   * @param {number} position
   * @return {void}
   */
  assign(position) {
    if (position === this.freeSlots.length) {
      const candidate = this.minify(this.trial);
      if (candidate.length < this.best.length) {
        this.best = candidate;
        this.improved = true;
      }
      return;
    }
    const slot = this.freeSlots[position];
    for (const value of this.candidates[position]) {
      this.trial[slot] = value;
      this.assign(position + 1);
    }
  }
}

/**
 * @param {readonly number[]} setters the last plain setter of each slot
 * @param {number} index the position of the declaration being rewritten
 * @return {boolean[]} for each slot, whether a later declaration sets it
 */
function overriddenSlots(setters, index) {
  return setters.map((setter) => setter > index);
}

/**
 * @param {BoxFamily} family
 * @param {BlockDeclarations} list
 * @param {readonly number[]} laneDecls
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {number[]} for each slot, the index in `laneDecls` of the last
 * declaration of the family that sets it and that every target parses, or `-1`
 */
function lastPlainSetters(family, list, laneDecls, features) {
  const last = family.longhands.map(() => -1);
  for (const [index, position] of laneDecls.entries()) {
    const declaration = list.at(position);
    const property = boxProperties.get(asciiLowerCase(declaration.prop));
    if (
      declaration.removed ||
      property?.family !== family ||
      hasHack(declaration.before, declaration.prop, declaration.value) ||
      needsUnmetSupport(declaration, features)
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
 * @param {BlockDeclarations} list
 * @param {readonly number[]} laneDecls
 * @param {Map<number, number> | undefined} inserted - the shorthand a commit
 * put after a declaration, by the position of that declaration
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
function freeOverriddenSlots(family, list, laneDecls, inserted, features) {
  const { parse, minify } = formsOf(family);
  /** @type {number[] | undefined} */
  let lastOverrider;

  for (let index = 0; index < laneDecls.length - 1; index++) {
    const anchor = laneDecls[index];
    const target = inserted?.get(anchor) ?? anchor;
    const item = list.at(target);
    if (item.removed) continue;
    const property = boxProperties.get(asciiLowerCase(item.prop));
    if (
      property?.family !== family ||
      property.slot !== shorthandSlot ||
      hasHack(item.before, item.prop, item.value) ||
      !isExplodable(item) ||
      mergeBlockingSupport(item, features).size > 0
    ) {
      continue;
    }

    lastOverrider ??= lastPlainSetters(family, list, laneDecls, features);
    const free = overriddenSlots(lastOverrider, index);
    if (!free.includes(true)) continue;

    const values = parse(componentTexts(item));
    const result = shortestWithFreeSlots(values, free, minify);
    if (result !== undefined && result.length < item.value.length) {
      list.rewrite(target, item.prop, result);
    }
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {BoxFamily} family
 * @param {({ value: string, decl: number } | null)[]} slots
 * @param {Set<number>} contributing
 * @param {Set<number>} fallbacks
 * @param {boolean} important
 * @param {boolean} mayInsert - whether every target supports the shorthand
 * @param {Map<number, number> | undefined} inserted
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
function flush(
  list,
  family,
  slots,
  contributing,
  fallbacks,
  important,
  mayInsert,
  inserted,
  features
) {
  const full = flushableSlots(slots, list, features);
  if (!full) return;

  const kw = isCssWideKeyword(full[0].value);
  const rawValues = full.map((s) => s.value).join(' ');
  const shorthandVal = kw ? full[0].value : formsOf(family).minify(rawValues);
  commitShorthand(list, full, contributing, fallbacks, {
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
 * @param {BlockDeclarations} list
 * @param {BoxFamily} family
 * @param {readonly number[]} laneDecls - the group's declarations of one
 * importance, in source order, by position in `list`
 * @param {boolean} important
 * @param {boolean} mayInsert - whether every target supports the shorthand
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export function reduceFamilyLane(
  list,
  family,
  laneDecls,
  important,
  mayInsert,
  features
) {
  const count = family.longhands.length;
  const { parse } = formsOf(family);
  const commits = new LaneCommits(
    list,
    family,
    laneDecls.length,
    important,
    mayInsert,
    features
  );
  const lane = new SlotLane(
    count,
    (slots, contributing, fallbacks) => {
      commits.commit(slots, contributing, fallbacks);
    },
    list,
    features
  );

  for (
    commits.position = 0;
    commits.position < laneDecls.length;
    commits.position++
  ) {
    const decl = laneDecls[commits.position];
    const item = list.at(decl);
    const property = isAll(item)
      ? undefined
      : boxProperties.get(asciiLowerCase(item.prop));
    if (property === undefined) {
      lane.reset();
      continue;
    }
    if (property.family !== family) {
      if (property.family.kind !== family.kind) lane.reset();
      continue;
    }
    const isShort = property.slot === shorthandSlot;
    if (
      hasHack(item.before, item.prop, item.value) ||
      (isShort && !isExplodable(item))
    ) {
      lane.reset();
      continue;
    }
    const wasFull = lane.begin(
      isShort ? 0 : property.slot,
      isShort ? count : 1,
      decl
    );

    const vals = isShort ? parse(componentTexts(item)) : null;
    for (let i = 0; i < count; i++) {
      if (isShort || i === property.slot) {
        lane.assign(i, vals ? vals[i] : item.value, decl, wasFull);
      }
    }
  }
  commits.position = laneDecls.length;
  lane.reset();

  if (laneDecls.length > 1)
    freeOverriddenSlots(family, list, laneDecls, commits.inserted, features);
}

/** The state that each commit of a lane's run shares with the next. */
class LaneCommits {
  /**
   * @param {BlockDeclarations} list
   * @param {BoxFamily} family
   * @param {number} length how many declarations the lane has
   * @param {boolean} important
   * @param {boolean} mayInsert whether every target supports the shorthand
   * @param {ReadonlySet<string>} features the features every target supports
   */
  constructor(list, family, length, important, mayInsert, features) {
    this.list = list;
    this.family = family;
    this.length = length;
    this.important = important;
    this.mayInsert = mayInsert;
    this.features = features;
    this.position = 0;
    /** @type {Map<number, number> | undefined} */
    this.inserted = undefined;
  }

  /**
   * @param {import('./slotVector.js').SlotVector} slots
   * @param {Set<number>} contributing
   * @param {Set<number>} fallbacks
   * @return {void}
   */
  commit(slots, contributing, fallbacks) {
    // Only a shorthand with a declaration after it can have a value overridden.
    if (this.position < this.length - 1) this.inserted ??= new Map();
    flush(
      this.list,
      this.family,
      slots,
      contributing,
      fallbacks,
      this.important,
      this.mayInsert,
      this.inserted,
      this.features
    );
  }
}
