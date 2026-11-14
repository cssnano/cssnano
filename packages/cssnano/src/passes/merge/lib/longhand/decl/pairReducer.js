import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
import {
  isCssWideKeyword,
  sharesShorthandKeyword,
} from '../isCssWideKeyword.js';
import { mergeBlockingSupport } from '../isFallback.js';
import { commitShorthand } from './slotVector.js';
import { hasNonAll } from './importanceLanes.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {PairFamily} from './pairForms.js'; */
/** @import {BlockDeclarations} from '../blockDeclarations.js'; */

/**
 * Replaces the longhands of one lane with the shorthand. A segment merges
 * only when it holds exactly one declaration for each longhand, so a repeated
 * longhand, which may be a fallback, keeps its segment as written.
 *
 * @param {BlockDeclarations} list
 * @param {PairFamily} family
 * @param {number[]} segment - positions in `list`
 * @param {boolean} important
 * @param {Map<number, string>} parsed - normalized values, by position
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
function mergeSegment(list, family, segment, important, parsed, features) {
  if (segment.length !== family.longhands.length) return;
  /** @type {(string | null)[]} */
  const slots = family.longhands.map(() => null);
  for (const position of segment) {
    slots[family.longhands.indexOf(asciiLowerCase(list.at(position).prop))] =
      parsed.get(position) ?? null;
  }
  if (slots.includes(null)) return;
  const values = /** @type {string[]} */ (slots);

  // A newer-syntax component is dropped, with the others, where unsupported.
  const [first, ...rest] = segment.map((position) =>
    mergeBlockingSupport(list.at(position), features)
  );
  if (rest.some((support) => support.symmetricDifference(first).size)) return;

  if (!sharesShorthandKeyword(values)) return;
  if (family.requires?.(values).some((feature) => !features.has(feature))) {
    return;
  }

  const value = isCssWideKeyword(values[0]) ? values[0] : family.emit(values);
  if (value === null) return;
  commitShorthand(list, [], new Set(segment), new Set(), {
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
 * @param {BlockDeclarations} list
 * @param {PairFamily} family
 * @param {number[]} declarations - positions in `list`
 * @param {[number[], number[]]} lanes - the declarations and `all` split by
 *   importance
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export function reducePairFamily(list, family, declarations, lanes, features) {
  // The shorthand and aliases such as grid-gap share the cascade.
  if (
    declarations.some(
      (d) => !family.longhands.includes(asciiLowerCase(list.at(d).prop))
    )
  ) {
    return;
  }

  /** @type {Map<number, string>} */
  const parsed = new Map();
  for (const position of declarations) {
    const decl = list.at(position);
    if (hasHack(decl.before, decl.prop, decl.value)) return;
    const slot = family.longhands.indexOf(asciiLowerCase(decl.prop));
    const value = family.parseValue[slot](decl);
    if (value === null) return;
    parsed.set(position, value);
  }

  for (const important of [false, true]) {
    const laneDecls = lanes[important ? 1 : 0];
    if (!hasNonAll(list, laneDecls)) continue;
    /** @type {number[]} */
    let segment = [];
    for (const position of laneDecls) {
      if (parsed.has(position)) {
        segment.push(position);
        continue;
      }
      mergeSegment(list, family, segment, important, parsed, features);
      segment = [];
    }
    mergeSegment(list, family, segment, important, parsed, features);
  }
}
