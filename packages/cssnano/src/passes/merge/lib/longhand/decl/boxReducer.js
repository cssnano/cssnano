import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { detectDeclaration } from '#stylehacks';
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
/** @import {TextTable} from '../../../../../values/textTable.js'; */

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

/**
 * @param {Declaration} d
 * @param {TextTable} textTable
 */
const isInvalid = (d, textTable) =>
  !detectDeclaration(d) &&
  !isCssWideKeyword(d.value) &&
  !boxBrowserKeeps(
    asciiLowerCase(d.prop),
    d.value,
    d.value.includes('(') ? textTable.tokens(d) : undefined
  );

/**
 * @param {Declaration[]} decls
 * @param {TextTable} textTable
 * @return {boolean} whether a declaration is one a browser ignores
 */
function hasInvalid(decls, textTable) {
  for (const d of decls) {
    if (isInvalid(d, textTable)) return true;
  }
  return false;
}

/**
 * @param {Container} rule
 * @param {BoxDeclarations} box
 * @param {import('../targetSupport.js').BoxSupport} support
 * @param {TextTable} textTable the tokens the walk left for the declarations
 * @return {void}
 */
export function reduceBox(rule, box, support, textTable) {
  const { group, decls, lanes } = box;
  if (!rule.nodes) return;

  if (decls.length === 0 || hasInvalid(decls, textTable)) return;

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
      !detectDeclaration(s) &&
      isExplodable(s, textTable)
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
        support.supportsAll(group.physical.shorthand),
        textTable
      );
    }
    if (!box.flow) continue;
    for (const family of box.flow) {
      reduceFamilyLane(
        rule,
        family,
        laneDecls,
        lane,
        support.supportsAll(family.shorthand),
        textTable
      );
    }
  }
}
