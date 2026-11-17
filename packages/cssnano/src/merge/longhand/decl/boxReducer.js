import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { hasHack } from '#stylehacks';
import { boxBrowserKeeps } from '../validateBox.js';
import { declarationTokens } from '../componentRanges.js';
import { boxProperties, shorthandSlot } from './boxGroups.js';
import { discardDeadDeclarations } from './crossKindCoverage.js';
import { discardOverriddenInLanes } from './overriddenDeclarations.js';
import { formsOf, isExplodable, reduceFamilyLane } from './slotSolver.js';
import { hasNonAll } from './importanceLanes.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js'; */
/** @import {BoxFamily} from './boxGroups.js'; */
/** @import {BoxGroup, BoxProperty} from './boxGroups.js'; */

/**
 * @typedef {object} BoxDeclarations What one run of a rule declares of a group.
 * @property {BoxGroup} group
 * @property {number[]} decls - positions of the properties of the group
 * @property {[number[], number[]]} lanes - the positions of the normal and the
 * important lane, which also hold what may alias a property of the group
 * @property {boolean} physical - whether a physical property appears
 * @property {Set<BoxFamily> | null} flow - the flow-relative families that
 * appear
 */

/**
 * A property of a group joins its lanes and its list of members; one that may
 * alias a member joins the lanes only, where it stops values moving across it.
 *
 * @param {{ boxes: Map<BoxGroup, BoxDeclarations> | null }} state
 * @param {number} child - the position of the declaration in its list
 * @param {BoxProperty | undefined} boxProperty
 * @param {BoxGroup} boxGroup
 * @param {number} laneIndex
 * @return {void}
 */
export function addBoxDeclaration(
  state,
  child,
  boxProperty,
  boxGroup,
  laneIndex
) {
  state.boxes ??= new Map();
  let box = state.boxes.get(boxGroup);
  if (!box) {
    box = {
      group: boxGroup,
      decls: [],
      lanes: [[], []],
      physical: false,
      flow: null,
    };
    state.boxes.set(boxGroup, box);
  }
  box.lanes[laneIndex].push(child);
  if (!boxProperty) return;
  box.decls.push(child);
  if (boxProperty.family.kind === 'physical') {
    box.physical = true;
  } else {
    (box.flow ??= new Set()).add(boxProperty.family);
  }
}

/**
 * @param {DeclarationItem} d
 */
const isInvalid = (d) =>
  !hasHack(d.before, d.prop, d.value) &&
  !isCssWideKeyword(d.value) &&
  !boxBrowserKeeps(asciiLowerCase(d.prop), d.value, declarationTokens(d));

/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} decls
 * @return {boolean} whether a declaration is one a browser ignores
 */
function hasInvalid(list, decls) {
  for (const position of decls) {
    if (isInvalid(list.at(position))) return true;
  }
  return false;
}

/**
 * @param {BlockDeclarations} list
 * @param {BoxDeclarations} box
 * @param {import('../targetSupport.js').BoxSupport} support
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export function reduceBox(list, box, support, features) {
  const { group, decls, lanes } = box;

  if (decls.length === 0 || hasInvalid(list, decls)) return;

  discardOverriddenInLanes(list, lanes, features, group.properties);
  if (box.flow) {
    for (const lane of lanes) {
      discardDeadDeclarations(list, lane, support, features);
    }
  }

  const live = decls.filter((p) => !list.at(p).removed);
  if (live.length <= 1) {
    const [position] = live;
    if (position === undefined) return;
    const s = list.at(position);
    const property = boxProperties.get(asciiLowerCase(s.prop));
    if (
      property?.slot === shorthandSlot &&
      !hasHack(s.before, s.prop, s.value) &&
      isExplodable(s)
    ) {
      const { family } = property;
      list.rewrite(position, family.shorthand, formsOf(family).minify(s.value));
    }
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = lanes[lane ? 1 : 0].filter((p) => !list.at(p).removed);
    if (!hasNonAll(list, laneDecls)) continue;
    if (box.physical) {
      reduceFamilyLane(
        list,
        group.physical,
        laneDecls,
        lane,
        support.supportsAll(group.physical.shorthand),
        features
      );
    }
    if (!box.flow) continue;
    for (const family of box.flow) {
      reduceFamilyLane(
        list,
        family,
        laneDecls,
        lane,
        support.supportsAll(family.shorthand),
        features
      );
    }
  }
}
