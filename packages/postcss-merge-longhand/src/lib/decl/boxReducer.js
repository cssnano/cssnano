import cssnanoUtils from 'cssnano-utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import stylehacks from 'stylehacks';
import { boxBrowserKeeps } from '../validateBox.js';
import { boxProperties, shorthandSlot } from './boxGroups.js';
import { discardDeadDeclarations } from './crossKindCoverage.js';
import { discardOverriddenInLanes } from './overriddenDeclarations.js';
import { formsOf, isExplodable, reduceFamilyLane } from './slotSolver.js';
import { hasNonAll } from './importanceLanes.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */
/** @import {BoxFamily} from './boxGroups.js'; */
/** @import {BoxGroup, BoxProperty} from './boxGroups.js'; */

/**
 * @typedef {object} BoxDeclarations What one run of a rule declares of a group.
 * @property {BoxGroup} group
 * @property {Declaration[]} decls - the properties of the group
 * @property {[Declaration[], Declaration[]]} lanes - the normal and the
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
 * @param {Declaration} child
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

/** @param {Declaration} d */
const isInvalid = (d) =>
  !stylehacks.detect(d) &&
  !isCssWideKeyword(d.value) &&
  !boxBrowserKeeps(asciiLowerCase(d.prop), d.value);

/**
 * @param {Container} rule
 * @param {BoxDeclarations} box
 * @param {import('../targetSupport.js').BoxSupport} support
 * @return {void}
 */
export function reduceBox(rule, box, support) {
  const { group, decls, lanes } = box;
  if (!rule.nodes) return;

  if (decls.length === 0 || decls.some(isInvalid)) return;

  discardOverriddenInLanes(lanes, group.properties);
  if (box.flow) {
    for (const lane of lanes) discardDeadDeclarations(lane, support);
  }

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    const s = live[0];
    const property = s && boxProperties.get(asciiLowerCase(s.prop));
    if (
      property?.slot === shorthandSlot &&
      !stylehacks.detect(s) &&
      isExplodable(s)
    ) {
      const { family } = property;
      s.prop = family.shorthand;
      s.value = formsOf(family).minify(s.value);
      delete s.raws?.value;
    }
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = lanes[lane ? 1 : 0].filter((d) => d.parent === rule);
    if (!hasNonAll(laneDecls)) continue;
    if (box.physical) {
      reduceFamilyLane(
        rule,
        group.physical,
        laneDecls,
        lane,
        support.supportsAll(group.physical.shorthand)
      );
    }
    if (!box.flow) continue;
    for (const family of box.flow) {
      reduceFamilyLane(
        rule,
        family,
        laneDecls,
        lane,
        support.supportsAll(family.shorthand)
      );
    }
  }
}
