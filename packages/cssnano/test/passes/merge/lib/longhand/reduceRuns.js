import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { isAll } from '../../../../../src/passes/merge/lib/longhand/decl/importanceLanes.js';
import { declarationRuns, importanceLanes } from './helpers/importanceLanes.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from '../../../../../src/passes/merge/lib/longhand/decl/borderData.js';
import { reduceBorder } from '../../../../../src/passes/merge/lib/longhand/decl/borderReducer.js';
import { reduceBorderRadius } from '../../../../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js';
import { reduceBox } from '../../../../../src/passes/merge/lib/longhand/decl/boxReducer.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import {
  aliasedGroup,
  boxGroups,
  boxProperties,
} from '../../../../../src/passes/merge/lib/longhand/decl/boxGroups.js';
import { BoxSupport } from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';
import {
  allColumnProps,
  reduceColumns,
} from '../../../../../src/passes/merge/lib/longhand/decl/columns.js';
import {
  commitToNodes,
  declarationsFromNodes,
} from '../../../../../src/passes/merge/lib/longhand/nodeDeclarations.js';
import { longstandingFeatures } from '../../../../../src/passes/merge/lib/longhand/syntaxFeatures.js';

/** @import {Container} from 'postcss'; */
/** @import {BlockDeclarations} from '../../../../../src/passes/merge/lib/longhand/blockDeclarations.js'; */
/** @import {BoxGroup} from '../../../../../src/passes/merge/lib/longhand/decl/boxGroups.js'; */
/** @import {BoxDeclarations} from '../../../../../src/passes/merge/lib/longhand/decl/boxReducer.js'; */

const defaultSupport = new BoxSupport(['ie 11']);

/**
 * Calls a family reducer once for every run of declarations in the rule, with
 * the positions and importance lanes that the plugin hands it, then writes the
 * block back the way the plugin does.
 *
 * @param {Container} rule
 * @param {(list: BlockDeclarations, position: number) => boolean} belongsToFamily
 * @param {(list: BlockDeclarations, decls: number[], lanes: [number[], number[]]) => void} reduce
 */
function reduceFamilyRuns(rule, belongsToFamily, reduce) {
  const textTable = new TextTable();
  const block = declarationsFromNodes(rule, createRunContext(textTable));
  const { list } = block;
  for (const run of declarationRuns(list)) {
    const decls = run.filter((p) => belongsToFamily(list, p));
    if (decls.length > 0) reduce(list, decls, importanceLanes(list, decls));
  }
  commitToNodes(block, textTable);
}

/**
 * Builds what the plugin hands the box reducer for one run of a group: its
 * properties, and the lanes, which also hold what may alias them.
 *
 * @param {BoxGroup} group
 * @param {number[]} run
 * @param {BlockDeclarations} list
 * @return {BoxDeclarations}
 */
export function boxDeclarations(group, run, list) {
  const members = run.filter((p) =>
    group.properties.has(list.at(p).prop.toLowerCase())
  );
  const kinds = members.map(
    (p) => boxProperties.get(list.at(p).prop.toLowerCase())?.family
  );
  return {
    group,
    decls: members,
    lanes: importanceLanes(
      list,
      run.filter((p) => {
        const prop = list.at(p).prop.toLowerCase();
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
  const textTable = new TextTable();
  const block = declarationsFromNodes(rule, createRunContext(textTable));
  for (const run of declarationRuns(block.list)) {
    const box = boxDeclarations(group, run, block.list);
    if (box.decls.length === 0) continue;
    if (box.flow.size === 0) box.flow = null;
    reduceBox(block.list, box, support, longstandingFeatures);
  }
  commitToNodes(block, textTable);
}

/** @param {Container} rule */
export function reduceColumnsRuns(rule) {
  reduceFamilyRuns(
    rule,
    (list, p) => allColumnProps.has(list.at(p).prop.toLowerCase()),
    (list, decls, lanes) =>
      reduceColumns(list, decls, lanes, longstandingFeatures)
  );
}

/** @param {Container} rule */
export function reduceBorderRadiusRuns(rule) {
  reduceFamilyRuns(
    rule,
    (list, p) => allRadiusProperties.has(list.at(p).prop.toLowerCase()),
    (list, decls, lanes) =>
      reduceBorderRadius(list, decls, lanes, longstandingFeatures)
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
    (list, p) => allPhysicalBorderProperties.has(list.at(p).prop.toLowerCase()),
    (list, decls) => reduceBorder(list, decls, foreign, longstandingFeatures)
  );
}
