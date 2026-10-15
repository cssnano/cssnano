import { withoutVendorPrefix } from '../vendorPrefix.js';
import { boxGroups as generatedGroups, shorthand, sides } from '../spec.js';
import flowRelativeSides from '../../data/flowRelativeSides.json' with { type: 'json' };

/**
 * The five groups of box properties (margin, padding, inset, scroll-margin and
 * scroll-padding). Each has a physical shorthand over the four sides and two
 * axis shorthands over a flow-relative start and end. Within a group, physical
 * and flow-relative properties are aliases for the same computed values, and
 * which physical side a flow-relative one means depends on `writing-mode` and
 * `direction`, which a minifier cannot know.
 *
 * @typedef {object} BoxFamily A shorthand and the longhands it sets.
 * @property {BoxGroup} group
 * @property {'physical' | 'flow'} kind
 * @property {string} shorthand
 * @property {string[]} longhands In slot order.
 * @property {string[]} slotKeys The side (`top`) or flow-relative suffix
 * (`block-start`) of each slot.
 *
 * @typedef {object} BoxGroup
 * @property {string} name
 * @property {BoxFamily} physical
 * @property {BoxFamily[]} flow The block axis, then the inline axis.
 * @property {Set<string>} properties Every shorthand and longhand of the group.
 * @property {{auto: boolean, percentage: boolean, negative: boolean}} grammar
 *
 * @typedef {object} BoxProperty
 * @property {string} name
 * @property {number} index A dense number from zero, to key tables by pair.
 * @property {BoxFamily} family
 * @property {number} slot The slot a longhand sets, or `-1` for the shorthand.
 * @property {number[]} cells What the property sets: the physical side, as
 * `mode * 4 + side`, in each combination of writing mode and direction.
 */

export const shorthandSlot = -1;

/**
 * The physical side each flow-relative suffix sets in each combination of
 * `writing-mode` and `direction`. Combinations that map every suffix alike,
 * such as `sideways-rl` and `vertical-rl`, set the same sides, so one stands
 * for them all.
 */
export const writingModes = [
  ...new Map(
    flowRelativeSides.modes.map((mode) => [
      Object.keys(mode.sides)
        .toSorted()
        .map(
          (suffix) => /** @type {Record<string, string>} */ (mode.sides)[suffix]
        )
        .join(),
      mode,
    ])
  ).values(),
];

/**
 * @param {string} group
 * @param {string} name - the shorthand
 * @param {'physical' | 'flow'} kind
 * @param {BoxGroup} owner
 * @return {BoxFamily}
 */
function createFamily(group, name, kind, owner) {
  const { longhands } = shorthand(name);
  // `inset` names its physical longhands after the bare sides.
  const prefix = kind === 'physical' && group === 'inset' ? '' : `${group}-`;
  return {
    group: owner,
    kind,
    shorthand: name,
    longhands,
    slotKeys: longhands.map((longhand) => longhand.slice(prefix.length)),
  };
}

/**
 * Every combination of `writing-mode` and `direction` sets each longhand to
 * one physical side, so a declaration sets one cell per mode and slot.
 *
 * @param {BoxFamily} family
 * @param {number} slot
 * @return {number[]}
 */
function cellsOf(family, slot) {
  const slots =
    slot === shorthandSlot ? family.slotKeys.keys().toArray() : [slot];
  return writingModes.flatMap((mode, index) =>
    slots.map((s) => {
      const key = family.slotKeys[s];
      const side =
        family.kind === 'physical'
          ? key
          : /** @type {Record<string, string>} */ (mode.sides)[key];
      return index * sides.length + sides.indexOf(side);
    })
  );
}

/** @type {BoxGroup[]} */
export const boxGroups = [];
/** @type {Map<string, BoxProperty>} */
export const boxProperties = new Map();

for (const [name, { axisShorthands, grammar }] of generatedGroups) {
  /** @type {BoxGroup} */
  const group = {
    name,
    grammar,
    physical: /** @type {BoxFamily} */ ({}),
    flow: [],
    properties: new Set(),
  };
  group.physical = createFamily(name, name, 'physical', group);
  group.flow = axisShorthands.map((axis) =>
    createFamily(name, axis, 'flow', group)
  );
  boxGroups.push(group);

  for (const family of [group.physical, ...group.flow]) {
    group.properties.add(family.shorthand);
    for (const longhand of family.longhands) group.properties.add(longhand);
    boxProperties.set(family.shorthand, {
      name: family.shorthand,
      index: boxProperties.size,
      family,
      slot: shorthandSlot,
      cells: cellsOf(family, shorthandSlot),
    });
    for (const [slot, longhand] of family.longhands.entries()) {
      boxProperties.set(longhand, {
        name: longhand,
        index: boxProperties.size,
        family,
        slot,
        cells: cellsOf(family, slot),
      });
    }
  }
}

/**
 * Properties that are not members of a group but may set the same values or
 * share its name: `scroll-snap-margin-top` is the older spelling of
 * `scroll-margin-top`, `-webkit-margin-start` an alias of
 * `margin-inline-start`, and `margin-trim` is unrelated but unknown here.
 * Whether a later declaration of the group may sit before or after one of
 * these changes the cascade, so they stop a fold.
 *
 * @type {[string, string][]}
 */
const aliasPrefixes = [
  ['scroll-snap-margin', 'scroll-margin'],
  ['scroll-margin', 'scroll-margin'],
  ['scroll-padding', 'scroll-padding'],
  ['margin', 'margin'],
  ['padding', 'padding'],
  ['inset', 'inset'],
  // Firefox 41 to 62 spelled the flow-relative insets `offset-block-start`.
  ['offset-block', 'inset'],
  ['offset-inline', 'inset'],
];
const groupsByName = new Map(boxGroups.map((group) => [group.name, group]));
const aliasInitials = new Set(aliasPrefixes.map(([prefix]) => prefix[0]));
aliasInitials.add('-');

/**
 * @param {string} prop - lowercased, and no member of any group
 * @return {BoxGroup | undefined}
 */
export function aliasedGroup(prop) {
  if (!aliasInitials.has(prop[0])) return undefined;
  const name = withoutVendorPrefix(prop);
  for (const [prefix, group] of aliasPrefixes) {
    if (name.startsWith(prefix)) {
      return groupsByName.get(group);
    }
  }
  return undefined;
}
