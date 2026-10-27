import { discardOverriddenInList } from './overriddenDeclarations.js';
import { SlotLane, commitShorthand, flushableSlots } from './slotVector.js';
import { expandFourSides, fourSideCount } from '../parseTrbl.js';
import { isGlobalKeyword } from '../validateRadius.js';
import { allRadiusProperties } from './borderData.js';
import { partitionLanes } from './radiusDescriptors.js';
import { joinRanges } from '../../../../../values/joinRanges.js';
import { delim, whitespace } from '../../../../../values/punctuationTokens.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Container, Declaration} from 'postcss'; */
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
 * The tokens that spell `shorthandText`, built from the sides' ranges.
 *
 * @param {Component[]} horizontal
 * @param {Component[]} vertical
 * @return {CSSToken[]}
 */
function shorthandTokens(horizontal, vertical) {
  const h = joinRanges(horizontal, [whitespace()]);
  if (sidesText(horizontal) === sidesText(vertical)) return h;
  const v = joinRanges(vertical, [whitespace()]);
  return joinRanges(
    [
      { list: h, start: 0, end: h.length },
      { list: v, start: 0, end: v.length },
    ],
    [delim('/')]
  );
}

/**
 * Synthesizes and commits a merged shorthand declaration if cost-model benefit is non-negative.
 *
 * @param {Container} rule
 * @param {SlotVector} slotVector
 * @param {Set<Declaration>} liveDefinitions
 * @param {Set<Declaration>} fallbackDefinitions
 * @param {boolean} isImportant
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function commitSlotVector(
  rule,
  slotVector,
  liveDefinitions,
  fallbackDefinitions,
  isImportant,
  textTable
) {
  /* Preserve CSS-wide keywords without merging to respect author inheritance contracts */
  if (slotVector.some((s) => s && isGlobalKeyword(s.value))) return;

  const full = flushableSlots(slotVector, textTable);
  if (!full) return;

  // Every slot of a radius lane keeps its range, as `assign` receives it.
  const sides = /** @type {Component[]} */ (
    slotVector.map((slot) => slot?.range)
  );
  const horizontal = minifiedSides([sides[0], sides[2], sides[4], sides[6]]);
  const vertical = minifiedSides([sides[1], sides[3], sides[5], sides[7]]);

  const value = shorthandText(horizontal, vertical);
  const written = commitShorthand(
    rule,
    full,
    liveDefinitions,
    fallbackDefinitions,
    { prop: 'border-radius', value, important: isImportant },
    textTable
  );
  // The list is built only for a declaration that was written.
  if (written) {
    textTable.record(written, value, shorthandTokens(horizontal, vertical));
  }
}

/**
 * Executes greedy vector coalescing over a lane's IR descriptors.
 *
 * @param {Container} rule
 * @param {RadiusDeclarationDescriptor[]} laneDescriptors
 * @param {boolean} isImportant
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function coalesceLane(rule, laneDescriptors, isImportant, textTable) {
  const lane = new SlotLane(
    8,
    (slots, contributing, fallbacks) =>
      commitSlotVector(
        rule,
        slots,
        contributing,
        fallbacks,
        isImportant,
        textTable
      ),
    textTable
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
        const horizontal = parsed.horizontal[i];
        const vertical = parsed.vertical[i];
        lane.assign(i * 2, horizontal.raw, desc.decl, wasFull, horizontal);
        lane.assign(i * 2 + 1, vertical.raw, desc.decl, wasFull, vertical);
      }
      continue;
    }

    // A CSS-wide keyword sets both radii of the corner, with no range to keep.
    if (desc.isGlobalKeyword) {
      lane.assign(idx * 2, desc.decl.value, desc.decl, wasFull);
      lane.assign(idx * 2 + 1, desc.decl.value, desc.decl, wasFull);
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
 * @param {RadiusDeclarationDescriptor} desc
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function canonicalizeSingleton(desc, textTable) {
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
    decl.prop = 'border-radius';
    // An unchanged text keeps the list the walk stored for it.
    const text = shorthandText(horizontal, vertical);
    if (text !== decl.value) {
      textTable.record(decl, text, shorthandTokens(horizontal, vertical));
    }
  } else if (desc.longhandIndex !== -1) {
    const cornerParsed =
      /** @type {NonNullable<ReturnType<typeof parseCornerRadius>>} */ (parsed);
    if (cornerParsed[0].raw === cornerParsed[1].raw) {
      decl.prop = /** @type {string} */ (prop);
      if (cornerParsed[0].raw !== decl.value) {
        textTable.record(
          decl,
          cornerParsed[0].raw,
          joinRanges([cornerParsed[0]], [])
        );
      }
    }
  }
}

/**
 * Intra-block dead-store elimination, bounded by `all` declarations.
 *
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function eliminateRedundantDeclarations(lanes, textTable) {
  for (const lane of lanes) {
    // A barrier descriptor holds its `all` declaration.
    discardOverriddenInList(
      lane.map((descriptor) => descriptor.decl),
      textTable,
      allRadiusProperties
    );
  }
}

/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} lanes
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
export function reduceBorderRadius(rule, decls, lanes, textTable) {
  if (!rule.nodes || rule.nodes.length === 0 || decls.length === 0) return;

  const partitioned = partitionLanes(rule, lanes, textTable);
  if (!partitioned) return;

  const { lanes: descriptorLanes, radiusDescriptors } = partitioned;

  eliminateRedundantDeclarations(descriptorLanes, textTable);

  const liveDecls = radiusDescriptors.filter((d) => d.decl.parent);
  if (liveDecls.length <= 1) {
    if (liveDecls[0]) canonicalizeSingleton(liveDecls[0], textTable);
    return;
  }

  for (const isImportant of [false, true]) {
    const laneDescriptors = descriptorLanes[isImportant ? 1 : 0];
    if (laneDescriptors.some((d) => !d.isBarrier && d.decl.parent === rule)) {
      coalesceLane(rule, laneDescriptors, isImportant, textTable);
    }
  }
}
