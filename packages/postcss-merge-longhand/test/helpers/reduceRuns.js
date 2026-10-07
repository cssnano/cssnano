import { isAll } from '../../src/lib/decl/importanceLanes.js';
import { declarationRuns, importanceLanes } from './importanceLanes.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from '../../src/lib/decl/borderData.js';
import { reduceBorder } from '../../src/lib/decl/borderReducer.js';
import { reduceBorderRadius } from '../../src/lib/decl/borderRadiusReducer.js';
import { reduceBox } from '../../src/lib/decl/boxReducer.js';
import {
  aliasedGroup,
  boxGroups,
  boxProperties,
} from '../../src/lib/decl/boxGroups.js';
import { BoxSupport } from '../../src/lib/targetSupport.js';
import { allColumnProps, reduceColumns } from '../../src/lib/decl/columns.js';
import { applyChildEdits } from '../../src/lib/deferredChildEdits.js';

/** @import {Container, Declaration} from 'postcss'; */
/** @import {BoxGroup} from '../../src/lib/decl/boxGroups.js'; */
/** @import {BoxDeclarations} from '../../src/lib/decl/boxReducer.js'; */

const defaultSupport = new BoxSupport(['ie 11']);

/**
 * Calls a family reducer once for every run of declarations in the rule, with
 * the declarations and importance lanes that the plugin hands it, then applies
 * the edits the way the plugin does.
 *
 * @param {Container} rule
 * @param {(declaration: Declaration) => boolean} belongsToFamily
 * @param {(decls: Declaration[], lanes: [Declaration[], Declaration[]]) => void} reduce
 */
function reduceFamilyRuns(rule, belongsToFamily, reduce) {
  for (const run of declarationRuns(rule)) {
    const decls = run.filter(belongsToFamily);
    if (decls.length > 0) reduce(decls, importanceLanes(rule, decls));
  }
  applyChildEdits(rule);
}

/**
 * Builds what the plugin hands the box reducer for one run of a group: its
 * properties, and the lanes, which also hold what may alias them.
 *
 * @param {BoxGroup} group
 * @param {Declaration[]} run
 * @param {Container} rule
 * @return {BoxDeclarations}
 */
export function boxDeclarations(group, run, rule) {
  const members = run.filter((d) => group.properties.has(d.prop.toLowerCase()));
  const kinds = members.map(
    (d) => boxProperties.get(d.prop.toLowerCase())?.family
  );
  return {
    group,
    decls: members,
    lanes: importanceLanes(
      rule,
      run.filter((d) => {
        const prop = d.prop.toLowerCase();
        return group.properties.has(prop) || aliasedGroup(prop) === group;
      })
    ),
    physical: kinds.some((family) => family?.kind === 'physical'),
    flow: new Set(kinds.filter((family) => family?.kind === 'flow')),
  };
}

/**
 * @param {Container} rule
 * @param {string} name - the group, such as `margin`
 * @param {BoxSupport} [support] - what the targets
 * support; Internet Explorer 11 by default
 */
export function reduceBoxRuns(rule, name, support = defaultSupport) {
  const group = /** @type {BoxGroup} */ (
    boxGroups.find((candidate) => candidate.name === name)
  );
  for (const run of declarationRuns(rule)) {
    const box = boxDeclarations(group, run, rule);
    if (box.decls.length === 0) continue;
    if (box.flow.size === 0) box.flow = null;
    reduceBox(rule, box, support);
  }
  applyChildEdits(rule);
}

/** @param {Container} rule */
export function reduceColumnsRuns(rule) {
  reduceFamilyRuns(
    rule,
    (d) => allColumnProps.has(d.prop.toLowerCase()),
    (decls, lanes) => reduceColumns(rule, decls, lanes)
  );
}

/** @param {Container} rule */
export function reduceBorderRadiusRuns(rule) {
  reduceFamilyRuns(
    rule,
    (d) => allRadiusProperties.has(d.prop.toLowerCase()),
    (decls, lanes) => reduceBorderRadius(rule, decls, lanes)
  );
}

/**
 * @param {Container} rule
 * @return {boolean} whether a declaration outside the physical border family
 * could cascade with it
 */
function hasForeignBorder(rule) {
  return (rule.nodes ?? []).some((node) => {
    if (node.type !== 'decl') return false;
    if (isAll(node)) return true;
    const p = node.prop.toLowerCase();
    return (
      p.startsWith('border-') &&
      p !== 'border-spacing' &&
      !allRadiusProperties.has(p) &&
      !allPhysicalBorderProperties.has(p)
    );
  });
}

/** @param {Container} rule */
export function reduceBorderRuns(rule) {
  const foreign = hasForeignBorder(rule);
  reduceFamilyRuns(
    rule,
    (d) => allPhysicalBorderProperties.has(d.prop.toLowerCase()),
    (decls) => reduceBorder(rule, decls, foreign)
  );
}
