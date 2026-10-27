import cssnanoUtils from '#utils';
import { sharesShorthandKeyword } from '../isCssWideKeyword.js';
import { detectDeclaration } from '#stylehacks';
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

/** @import {Container, Declaration} from 'postcss'; */
/** @import {AlignmentFamilyConfig} from './alignmentForms.js'; */

/** @typedef {Map<Declaration, [string | null, string | null]>} ParsedDeclarations */

/**
 * Replaces consecutive declarations of one family with a single shorthand
 * when both axes are set. The later declaration of an axis wins, as in the
 * cascade; the caller has already rejected repeated properties, so no
 * declaration serves as a fallback for another.
 *
 * @param {Container} rule
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration[]} segment
 * @param {boolean} important
 * @param {ParsedDeclarations} parsedDecls
 * @return {void}
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function mergeSegment(
  rule,
  family,
  segment,
  important,
  parsedDecls,
  textTable
) {
  /** @type {(string | null)[]} */
  const axes = [null, null];
  for (const decl of segment) {
    const parsed = /** @type {[string | null, string | null]} */ (
      parsedDecls.get(decl)
    );
    for (const [axis, value] of parsed.entries()) {
      if (value !== null) axes[axis] = value;
    }
  }
  const [align, justify] = axes;
  if (align === null || justify === null) return;
  if (segment.some((decl) => isCustomProp(decl, textTable))) return;

  // A CSS-wide keyword cannot share a shorthand with another value.
  if (!sharesShorthandKeyword([align, justify])) return;

  const values = segment.map((decl) =>
    /** @type {[string | null, string | null]} */ (parsedDecls.get(decl))
      .filter((value) => value !== null)
      .join(' ')
  );
  if (!sharesKeywordSupport(values)) return;

  commitShorthand(rule, [], new Set(segment), new Set(), {
    prop: family.shorthand,
    value: normalizeAlignment(family, [align, justify]),
    important,
  });
}

/**
 * Reduces alignment declarations within a single importance lane. Hacks,
 * unparsed values and `all` end a segment.
 *
 * @param {Container} rule
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration[]} laneDecls
 * @param {boolean} important
 * @param {ParsedDeclarations} parsedDecls
 * @return {void}
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function processLane(
  rule,
  family,
  laneDecls,
  important,
  parsedDecls,
  textTable
) {
  /** @type {Declaration[]} */
  let segment = [];
  for (const decl of laneDecls) {
    if (parsedDecls.has(decl)) {
      segment.push(decl);
      continue;
    }
    mergeSegment(rule, family, segment, important, parsedDecls, textTable);
    segment = [];
  }
  mergeSegment(rule, family, segment, important, parsedDecls, textTable);
}

/**
 * Whether the declarations can be reduced at all: both longhands, or a
 * shorthand and a longhand.
 *
 * @param {Declaration[]} declarations
 * @return {boolean}
 */
function hasMergeableProperties(declarations) {
  return new Set(declarations.map((d) => asciiLowerCase(d.prop))).size > 1;
}

/**
 * Reduces paired box alignment longhand declarations within a container into
 * shorthand. Existing shorthands are normalized by the shorthand folding pass.
 *
 * @param {Container} rule
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration[]} declarations
 * @param {[Declaration[], Declaration[]]} lanes - the declarations and `all`
 *   split by importance
 * @return {void}
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
export function reduceAlignmentFamily(
  rule,
  family,
  declarations,
  lanes,
  textTable
) {
  if (
    declarations.some((d) => !family.allProps.has(asciiLowerCase(d.prop))) ||
    !hasMergeableProperties(declarations)
  ) {
    return;
  }

  /* A repeated property is usually a fallback for browsers that reject the
   * later value; merging would leave those browsers with neither. */
  if (lanes.some(repeatsProperty)) return;

  /** @type {ParsedDeclarations} */
  const parsedDecls = new Map();
  for (const decl of declarations) {
    const isShort = asciiLowerCase(decl.prop) === family.shorthand;
    // Hacks and substitution-backed shorthands only bound a segment.
    if (detectDeclaration(decl) || (isShort && !canExplode(decl, textTable)))
      continue;
    const parsed = parseAlignmentDeclaration(family, decl, textTable);
    if (!parsed) return;
    parsedDecls.set(decl, parsed);
  }

  for (const lane of [false, true]) {
    const laneDecls = lanes[lane ? 1 : 0];
    if (hasNonAll(laneDecls)) {
      processLane(rule, family, laneDecls, lane, parsedDecls, textTable);
    }
  }
}
