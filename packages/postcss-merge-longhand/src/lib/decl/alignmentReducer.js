import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import isCustomProp from '../isCustomProp.js';
import { commitShorthand } from './slotVector.js';
import { importanceLanes, isAll } from './importanceLanes.js';
import {
  normalizeAlignment,
  parseAlignmentDeclaration,
  sharesKeywordSupport,
} from './alignmentForms.js';

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
 */
function mergeSegment(rule, family, segment, important, parsedDecls) {
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
  if (segment.some(isCustomProp)) return;

  // A CSS-wide keyword cannot share a shorthand with another value.
  const isGlobal = cssGlobalKeywords.has(align.toLowerCase());
  if (isGlobal !== cssGlobalKeywords.has(justify.toLowerCase())) return;
  if (isGlobal && align.toLowerCase() !== justify.toLowerCase()) return;

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
 */
function processLane(rule, family, laneDecls, important, parsedDecls) {
  /** @type {Declaration[]} */
  let segment = [];
  for (const decl of laneDecls) {
    if (parsedDecls.has(decl)) {
      segment.push(decl);
      continue;
    }
    mergeSegment(rule, family, segment, important, parsedDecls);
    segment = [];
  }
  mergeSegment(rule, family, segment, important, parsedDecls);
}

/**
 * Whether a property occurs twice without an `all` reset in between.
 *
 * @param {Declaration[]} laneDecls
 * @return {boolean}
 */
function repeatsProperty(laneDecls) {
  const seen = new Set();
  for (const decl of laneDecls) {
    if (isAll(decl)) {
      seen.clear();
      continue;
    }
    const prop = decl.prop.toLowerCase();
    if (seen.has(prop)) return true;
    seen.add(prop);
  }
  return false;
}

/**
 * Whether the declarations can be reduced at all: both longhands, or a
 * shorthand and a longhand.
 *
 * @param {Declaration[]} declarations
 * @return {boolean}
 */
function hasMergeableProperties(declarations) {
  return new Set(declarations.map((d) => d.prop.toLowerCase())).size > 1;
}

/**
 * Reduces paired box alignment longhand declarations within a container into
 * shorthand. Existing shorthands are normalized by the shorthand folding pass.
 *
 * @param {Container} rule
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration[]} declarations
 * @param {[Declaration[], Declaration[]]} [lanes] - the declarations and `all`
 *   split by importance, when the caller already collected them
 * @return {void}
 */
export function reduceAlignmentFamily(rule, family, declarations, lanes) {
  if (
    declarations.some((d) => !family.allProps.has(d.prop.toLowerCase())) ||
    !hasMergeableProperties(declarations)
  ) {
    return;
  }

  const familyLanes = lanes ?? importanceLanes(rule, declarations);
  /* A repeated property is usually a fallback for browsers that reject the
   * later value; merging would leave those browsers with neither. */
  if (familyLanes.some(repeatsProperty)) return;

  /** @type {ParsedDeclarations} */
  const parsedDecls = new Map();
  for (const decl of declarations) {
    const isShort = decl.prop.toLowerCase() === family.shorthand;
    // Hacks and substitution-backed shorthands only bound a segment.
    if (stylehacks.detect(decl) || (isShort && !canExplode(decl))) continue;
    const parsed = parseAlignmentDeclaration(family, decl);
    if (!parsed) return;
    parsedDecls.set(decl, parsed);
  }

  for (const lane of [false, true]) {
    const laneDecls = familyLanes[lane ? 1 : 0];
    if (laneDecls.some((d) => !isAll(d))) {
      processLane(rule, family, laneDecls, lane, parsedDecls);
    }
  }
}
