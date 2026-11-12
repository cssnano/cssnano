import { discardOverriddenInList } from './overriddenDeclarations.js';
import { SlotLane, commitShorthand, flushableSlots } from './slotVector.js';
import { expandFourSides, fourSideCount } from '../parseTrbl.js';
import { isGlobalKeyword } from '../validateRadius.js';
import { allRadiusProperties } from './borderData.js';
import { partitionLanes } from './radiusDescriptors.js';

/** @import {BlockDeclarations} from '../blockDeclarations.js'; */
/** @import {SlotVector} from './slotVector.js'; */
/** @import {RadiusDeclarationDescriptor} from './radiusDescriptors.js'; */
/** @import {parseCornerRadius, parseRadiusShorthand} from '../validateRadius.js'; */
/** @import {Component} from '../valueComponents.js'; */

/**
 * The sides a shorthand minifies to, as `minifyTrbl` keeps them.
 *
 * @param {Component[]} sides four sides, as the parser spreads them
 * @return {Component[]}
 */
function minifiedSides(sides) {
  const expanded = expandFourSides(sides);
  return expanded.slice(0, fourSideCount(expanded.map((side) => side.raw)));
}

/**
 * @param {Component[]} sides
 * @return {string} the text the sides spell, joined by spaces
 */
function sidesText(sides) {
  return sides.map((side) => side.raw).join(' ');
}

/**
 * The text of a shorthand whose sides are minified: `horizontal/vertical`, or
 * `horizontal` alone when both spell alike.
 *
 * @param {Component[]} horizontal
 * @param {Component[]} vertical
 * @return {string}
 */
function shorthandText(horizontal, vertical) {
  const h = sidesText(horizontal);
  const v = sidesText(vertical);
  return h === v ? h : `${h}/${v}`;
}

/**
 * Synthesizes and commits a merged shorthand declaration if cost-model benefit is non-negative.
 *
 * @param {BlockDeclarations} list
 * @param {SlotVector} slotVector
 * @param {Set<number>} liveDefinitions
 * @param {Set<number>} fallbackDefinitions
 * @param {boolean} isImportant
 * @param {ReadonlySet<string>} features the features every target supports
 */
function commitSlotVector(
  list,
  slotVector,
  liveDefinitions,
  fallbackDefinitions,
  isImportant,
  features
) {
  /* Preserve CSS-wide keywords without merging to respect author inheritance contracts */
  if (slotVector.some((s) => s && isGlobalKeyword(s.value))) return;

  const full = flushableSlots(slotVector, list, features);
  if (!full) return;

  // Every slot of a radius lane keeps its range, as `assign` receives it.
  const sides = /** @type {Component[]} */ (
    slotVector.map((slot) => slot?.range)
  );
  const horizontal = minifiedSides([sides[0], sides[2], sides[4], sides[6]]);
  const vertical = minifiedSides([sides[1], sides[3], sides[5], sides[7]]);

  commitShorthand(list, full, liveDefinitions, fallbackDefinitions, {
    prop: 'border-radius',
    value: shorthandText(horizontal, vertical),
    important: isImportant,
  });
}

/**
 * Executes greedy vector coalescing over a lane's IR descriptors.
 *
 * @param {BlockDeclarations} list
 * @param {RadiusDeclarationDescriptor[]} laneDescriptors
 * @param {boolean} isImportant
 * @param {ReadonlySet<string>} features the features every target supports
 */
function coalesceLane(list, laneDescriptors, isImportant, features) {
  const lane = new SlotLane(
    8,
    (slots, contributing, fallbacks) =>
      commitSlotVector(
        list,
        slots,
        contributing,
        fallbacks,
        isImportant,
        features
      ),
    list,
    features
  );

  for (const desc of laneDescriptors) {
    if (list.at(desc.decl).removed) continue;

    if (
      desc.isBarrier ||
      desc.isHacked ||
      (desc.isShorthand && !desc.canExplode)
    ) {
      lane.reset();
      continue;
    }

    const idx = desc.isShorthand
      ? -1
      : /** @type {number} */ (desc.longhandIndex);
    const wasFull = lane.begin(
      Math.max(idx * 2, 0),
      idx === -1 ? 8 : 2,
      desc.decl
    );

    if (desc.isShorthand) {
      const parsed = /** @type {ReturnType<typeof parseRadiusShorthand>} */ (
        desc.parsed
      );
      if (!parsed) {
        lane.reset();
        continue;
      }
      for (let i = 0; i < 4; i++) {
        const horizontal = parsed.horizontal[i];
        const vertical = parsed.vertical[i];
        lane.assign(i * 2, horizontal.raw, desc.decl, wasFull, horizontal);
        lane.assign(i * 2 + 1, vertical.raw, desc.decl, wasFull, vertical);
      }
      continue;
    }

    // A CSS-wide keyword sets both radii of the corner, with no range to keep.
    if (desc.isGlobalKeyword) {
      const value = list.at(desc.decl).value;
      lane.assign(idx * 2, value, desc.decl, wasFull);
      lane.assign(idx * 2 + 1, value, desc.decl, wasFull);
      continue;
    }
    const parsed = /** @type {ReturnType<typeof parseCornerRadius>} */ (
      desc.parsed
    );
    if (!parsed) {
      lane.reset();
      continue;
    }
    lane.assign(idx * 2, parsed[0].raw, desc.decl, wasFull, parsed[0]);
    lane.assign(idx * 2 + 1, parsed[1].raw, desc.decl, wasFull, parsed[1]);
  }

  lane.reset();
}

/**
 * Applies peephole canonicalization / algebraic folding to a standalone declaration.
 *
 * @param {BlockDeclarations} list
 * @param {RadiusDeclarationDescriptor} desc
 */
function canonicalizeSingleton(list, desc) {
  const {
    decl,
    prop,
    isHacked,
    isGlobalKeyword: isGlobal,
    isShorthand,
    canExplode: explodable,
    parsed,
  } = desc;
  if (isHacked || isGlobal || !parsed) return;
  if (isShorthand && explodable) {
    const shorthandParsed =
      /** @type {NonNullable<ReturnType<typeof parseRadiusShorthand>>} */ (
        parsed
      );
    const horizontal = minifiedSides(shorthandParsed.horizontal);
    const vertical = minifiedSides(shorthandParsed.vertical);
    list.rewrite(decl, 'border-radius', shorthandText(horizontal, vertical));
  } else if (desc.longhandIndex !== -1) {
    const cornerParsed =
      /** @type {NonNullable<ReturnType<typeof parseCornerRadius>>} */ (parsed);
    if (cornerParsed[0].raw === cornerParsed[1].raw) {
      list.rewrite(decl, /** @type {string} */ (prop), cornerParsed[0].raw);
    }
  }
}

/**
 * Intra-block dead-store elimination, bounded by `all` declarations.
 *
 * @param {BlockDeclarations} list
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 * @param {ReadonlySet<string>} features the features every target supports
 */
function eliminateRedundantDeclarations(list, lanes, features) {
  for (const lane of lanes) {
    // A barrier descriptor holds its `all` declaration.
    discardOverriddenInList(
      list,
      lane.map((descriptor) => descriptor.decl),
      features,
      allRadiusProperties
    );
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {number[]} decls - positions in `list`
 * @param {[number[], number[]]} lanes
 * @param {ReadonlySet<string>} features the features every target supports
 */
export function reduceBorderRadius(list, decls, lanes, features) {
  if (decls.length === 0) return;

  const partitioned = partitionLanes(list, lanes);
  if (!partitioned) return;

  const { lanes: descriptorLanes, radiusDescriptors } = partitioned;

  eliminateRedundantDeclarations(list, descriptorLanes, features);

  const liveDecls = radiusDescriptors.filter((d) => !list.at(d.decl).removed);
  if (liveDecls.length <= 1) {
    if (liveDecls[0]) canonicalizeSingleton(list, liveDecls[0]);
    return;
  }

  for (const isImportant of [false, true]) {
    const laneDescriptors = descriptorLanes[isImportant ? 1 : 0];
    if (laneDescriptors.some((d) => !d.isBarrier && !list.at(d.decl).removed)) {
      coalesceLane(list, laneDescriptors, isImportant, features);
    }
  }
}
