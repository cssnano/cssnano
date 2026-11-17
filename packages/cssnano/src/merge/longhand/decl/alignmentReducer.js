import cssnanoUtils from '#utils';
import { sharesShorthandKeyword } from '../isCssWideKeyword.js';
import { hasHack } from '#stylehacks';
import canExplode from '../canExplode.js';
import isCustomProp from '../isCustomProp.js';
import { commitShorthand } from './slotVector.js';
import { hasNonAll, repeatsProperty } from './importanceLanes.js';
import {
  normalizeAlignment,
  parseAlignmentDeclaration,
  sharesKeywordSupport,
} from './alignmentForms.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {AlignmentFamilyConfig} from './alignmentForms.js'; */
/** @import {BlockDeclarations} from '../blockDeclarations.js'; */

/** @typedef {Map<number, [string | null, string | null]>} ParsedDeclarations by position */

/**
 * Replaces consecutive declarations of one family with a single shorthand
 * when both axes are set. The later declaration of an axis wins, as in the
 * cascade; the caller has already rejected repeated properties, so no
 * declaration serves as a fallback for another.
 *
 * @param {BlockDeclarations} list
 * @param {AlignmentFamilyConfig} family
 * @param {number[]} segment - positions in `list`
 * @param {boolean} important
 * @param {ParsedDeclarations} parsedDecls
 * @return {void}
 */
function mergeSegment(list, family, segment, important, parsedDecls) {
  /** @type {(string | null)[]} */
  const axes = [null, null];
  for (const position of segment) {
    const parsed = /** @type {[string | null, string | null]} */ (
      parsedDecls.get(position)
    );
    for (const [axis, value] of parsed.entries()) {
      if (value !== null) axes[axis] = value;
    }
  }
  const [align, justify] = axes;
  if (align === null || justify === null) return;
  if (segment.some((position) => isCustomProp(list.at(position)))) return;

  // A CSS-wide keyword cannot share a shorthand with another value.
  if (!sharesShorthandKeyword([align, justify])) return;

  const values = segment.map((position) =>
    /** @type {[string | null, string | null]} */ (parsedDecls.get(position))
      .filter((value) => value !== null)
      .join(' ')
  );
  if (!sharesKeywordSupport(values)) return;

  commitShorthand(list, [], new Set(segment), new Set(), {
    prop: family.shorthand,
    value: normalizeAlignment(family, [align, justify]),
    important,
  });
}

/**
 * Reduces alignment declarations within a single importance lane. Hacks,
 * unparsed values and `all` end a segment.
 *
 * @param {BlockDeclarations} list
 * @param {AlignmentFamilyConfig} family
 * @param {readonly number[]} laneDecls
 * @param {boolean} important
 * @param {ParsedDeclarations} parsedDecls
 * @return {void}
 */
function processLane(list, family, laneDecls, important, parsedDecls) {
  /** @type {number[]} */
  let segment = [];
  for (const position of laneDecls) {
    if (parsedDecls.has(position)) {
      segment.push(position);
      continue;
    }
    mergeSegment(list, family, segment, important, parsedDecls);
    segment = [];
  }
  mergeSegment(list, family, segment, important, parsedDecls);
}

/**
 * Whether the declarations can be reduced at all: both longhands, or a
 * shorthand and a longhand.
 *
 * @param {BlockDeclarations} list
 * @param {readonly number[]} declarations
 * @return {boolean}
 */
function hasMergeableProperties(list, declarations) {
  return (
    new Set(declarations.map((d) => asciiLowerCase(list.at(d).prop))).size > 1
  );
}

/**
 * Reduces paired box alignment longhand declarations within a container into
 * shorthand. Existing shorthands are normalized by the shorthand folding pass.
 *
 * @param {BlockDeclarations} list
 * @param {AlignmentFamilyConfig} family
 * @param {number[]} declarations - positions in `list`
 * @param {[number[], number[]]} lanes - the declarations and `all` split by
 *   importance
 * @return {void}
 */
export function reduceAlignmentFamily(list, family, declarations, lanes) {
  if (
    declarations.some(
      (d) => !family.allProps.has(asciiLowerCase(list.at(d).prop))
    ) ||
    !hasMergeableProperties(list, declarations)
  ) {
    return;
  }

  /* A repeated property is usually a fallback for browsers that reject the
   * later value; merging would leave those browsers with neither. */
  if (lanes.some((lane) => repeatsProperty(list, lane))) return;

  /** @type {ParsedDeclarations} */
  const parsedDecls = new Map();
  for (const position of declarations) {
    const decl = list.at(position);
    const isShort = asciiLowerCase(decl.prop) === family.shorthand;
    // Hacks and substitution-backed shorthands only bound a segment.
    if (
      hasHack(decl.before, decl.prop, decl.value) ||
      (isShort && !canExplode(decl))
    )
      continue;
    const parsed = parseAlignmentDeclaration(family, decl);
    if (!parsed) return;
    parsedDecls.set(position, parsed);
  }

  for (const lane of [false, true]) {
    const laneDecls = lanes[lane ? 1 : 0];
    if (hasNonAll(list, laneDecls)) {
      processLane(list, family, laneDecls, lane, parsedDecls);
    }
  }
}
