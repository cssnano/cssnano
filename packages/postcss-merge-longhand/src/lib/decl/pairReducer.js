import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import {
  isCssWideKeyword,
  sharesShorthandKeyword,
} from '../isCssWideKeyword.js';
import { mergeBlockingSupport } from '../isFallback.js';
import { commitShorthand } from './slotVector.js';
import { hasNonAll, repeatsProperty } from './importanceLanes.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */
/** @import {PairFamily} from './pairForms.js'; */

/**
 * Replaces the longhands of one lane with the shorthand. A repeated
 * longhand has been rejected by the caller, so no declaration is a fallback
 * for another, and each longhand occurs at most once per segment.
 *
 * @param {Container} rule
 * @param {PairFamily} family
 * @param {Declaration[]} segment
 * @param {boolean} important
 * @param {Map<Declaration, string>} parsed - normalized values
 * @return {void}
 */
function mergeSegment(rule, family, segment, important, parsed) {
  if (segment.length !== family.longhands.length) return;
  /** @type {(string | null)[]} */
  const slots = family.longhands.map(() => null);
  for (const decl of segment) {
    slots[family.longhands.indexOf(asciiLowerCase(decl.prop))] =
      parsed.get(decl) ?? null;
  }
  if (slots.includes(null)) return;
  const values = /** @type {string[]} */ (slots);

  // A newer-syntax component is dropped, with the others, where unsupported.
  const [first, ...rest] = segment.map(mergeBlockingSupport);
  if (rest.some((support) => support.symmetricDifference(first).size)) return;

  if (!sharesShorthandKeyword(values)) return;

  const value = isCssWideKeyword(values[0]) ? values[0] : family.emit(values);
  if (value === null) return;
  commitShorthand(rule, [], new Set(segment), new Set(), {
    prop: family.shorthand,
    value,
    important,
  });
}

/**
 * Reduces the longhand pair of one family within a container into its
 * shorthand. Anything the reducer cannot parse leaves the whole family as
 * written: a declaration it does not understand could be a fallback or a
 * hack, and the shorthand would reorder it.
 *
 * @param {Container} rule
 * @param {PairFamily} family
 * @param {Declaration[]} declarations
 * @param {[Declaration[], Declaration[]]} lanes - the declarations and `all`
 *   split by importance
 * @return {void}
 */
export function reducePairFamily(rule, family, declarations, lanes) {
  // The shorthand and aliases such as grid-gap share the cascade.
  if (
    declarations.some((d) => !family.longhands.includes(asciiLowerCase(d.prop)))
  ) {
    return;
  }
  if (lanes.some(repeatsProperty)) return;

  /** @type {Map<Declaration, string>} */
  const parsed = new Map();
  for (const decl of declarations) {
    if (stylehacks.detect(decl)) return;
    const slot = family.longhands.indexOf(asciiLowerCase(decl.prop));
    const value = family.parseValue[slot](decl.value);
    if (value === null) return;
    parsed.set(decl, value);
  }

  for (const important of [false, true]) {
    const laneDecls = lanes[important ? 1 : 0];
    if (!hasNonAll(laneDecls)) continue;
    /** @type {Declaration[]} */
    let segment = [];
    for (const decl of laneDecls) {
      if (parsed.has(decl)) {
        segment.push(decl);
        continue;
      }
      mergeSegment(rule, family, segment, important, parsed);
      segment = [];
    }
    mergeSegment(rule, family, segment, important, parsed);
  }
}
