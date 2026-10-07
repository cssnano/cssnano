import { discardOverriddenInList } from './overriddenDeclarations.js';
import minifyTrbl from '../minifyTrbl.js';
import { SlotLane, commitShorthand, flushableSlots } from './slotVector.js';
import { isGlobalKeyword } from '../validateRadius.js';
import { allRadiusProperties } from './borderData.js';
import { partitionLanes } from './radiusDescriptors.js';

/** @import {Container, Declaration} from 'postcss'; */
/** @import {SlotVector} from './slotVector.js'; */
/** @import {RadiusDeclarationDescriptor} from './radiusDescriptors.js'; */
/** @import {parseCornerRadius, parseRadiusShorthand} from '../validateRadius.js'; */

/**
 * Synthesizes and commits a merged shorthand declaration if cost-model benefit is non-negative.
 *
 * @param {Container} rule
 * @param {SlotVector} slotVector
 * @param {Set<Declaration>} liveDefinitions
 * @param {Set<Declaration>} fallbackDefinitions
 * @param {boolean} isImportant
 */
function commitSlotVector(
  rule,
  slotVector,
  liveDefinitions,
  fallbackDefinitions,
  isImportant
) {
  /* Preserve CSS-wide keywords without merging to respect author inheritance contracts */
  if (slotVector.some((s) => s && isGlobalKeyword(s.value))) return;

  const full = flushableSlots(slotVector);
  if (!full) return;

  const horizontal = minifyTrbl([
    full[0].value,
    full[2].value,
    full[4].value,
    full[6].value,
  ]);
  const vertical = minifyTrbl([
    full[1].value,
    full[3].value,
    full[5].value,
    full[7].value,
  ]);
  const shorthandVal =
    horizontal === vertical ? horizontal : `${horizontal}/${vertical}`;

  commitShorthand(rule, full, liveDefinitions, fallbackDefinitions, {
    prop: 'border-radius',
    value: shorthandVal,
    important: isImportant,
  });
}

/**
 * Executes greedy vector coalescing over a lane's IR descriptors.
 *
 * @param {Container} rule
 * @param {RadiusDeclarationDescriptor[]} laneDescriptors
 * @param {boolean} isImportant
 */
function coalesceLane(rule, laneDescriptors, isImportant) {
  const lane = new SlotLane(8, (slots, contributing, fallbacks) =>
    commitSlotVector(rule, slots, contributing, fallbacks, isImportant)
  );

  for (const desc of laneDescriptors) {
    if (desc.decl.parent !== rule) continue;

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
        lane.assign(i * 2, parsed.horizontal[i], desc.decl, wasFull);
        lane.assign(i * 2 + 1, parsed.vertical[i], desc.decl, wasFull);
      }
      continue;
    }

    // A CSS-wide keyword sets both radii of the corner.
    const parsed = desc.isGlobalKeyword
      ? [desc.decl.value, desc.decl.value]
      : /** @type {ReturnType<typeof parseCornerRadius>} */ (desc.parsed);
    if (!parsed) {
      lane.reset();
      continue;
    }
    lane.assign(idx * 2, parsed[0], desc.decl, wasFull);
    lane.assign(idx * 2 + 1, parsed[1], desc.decl, wasFull);
  }

  lane.reset();
}

/**
 * Applies peephole canonicalization / algebraic folding to a standalone declaration.
 *
 * @param {RadiusDeclarationDescriptor} desc
 */
function canonicalizeSingleton(desc) {
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
    const h = minifyTrbl(shorthandParsed.horizontal);
    const v = minifyTrbl(shorthandParsed.vertical);
    decl.prop = 'border-radius';
    decl.value = h === v ? h : `${h}/${v}`;
    if (decl.raws) delete decl.raws.value;
  } else if (desc.longhandIndex !== -1) {
    const cornerParsed =
      /** @type {NonNullable<ReturnType<typeof parseCornerRadius>>} */ (parsed);
    if (cornerParsed[0] === cornerParsed[1]) {
      decl.prop = /** @type {string} */ (prop);
      decl.value = cornerParsed[0];
      if (decl.raws) delete decl.raws.value;
    }
  }
}

/**
 * Intra-block dead-store elimination, bounded by `all` declarations.
 *
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 */
function eliminateRedundantDeclarations(lanes) {
  for (const lane of lanes) {
    // A barrier descriptor holds its `all` declaration.
    discardOverriddenInList(
      lane.map((descriptor) => descriptor.decl),
      allRadiusProperties
    );
  }
}

/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} lanes
 */
export function reduceBorderRadius(rule, decls, lanes) {
  if (!rule.nodes || rule.nodes.length === 0 || decls.length === 0) return;

  const partitioned = partitionLanes(rule, lanes);
  if (!partitioned) return;

  const { lanes: descriptorLanes, radiusDescriptors } = partitioned;

  eliminateRedundantDeclarations(descriptorLanes);

  const liveDecls = radiusDescriptors.filter((d) => d.decl.parent);
  if (liveDecls.length <= 1) {
    if (liveDecls[0]) canonicalizeSingleton(liveDecls[0]);
    return;
  }

  for (const isImportant of [false, true]) {
    const laneDescriptors = descriptorLanes[isImportant ? 1 : 0];
    if (laneDescriptors.some((d) => !d.isBarrier && d.decl.parent === rule)) {
      coalesceLane(rule, laneDescriptors, isImportant);
    }
  }
}
