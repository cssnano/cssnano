import { createRunContext } from '../../../../../../src/passes/ir/runContext.js';
import { isAll } from '../../../../../../src/passes/merge/lib/longhand/decl/importanceLanes.js';
import { declarationRuns, importanceLanes } from './importanceLanes.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
} from '../../../../../../src/passes/merge/lib/longhand/decl/borderData.js';
import { reduceBorder } from '../../../../../../src/passes/merge/lib/longhand/decl/borderReducer.js';
import { reduceBorderRadius } from '../../../../../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js';
import { reduceBox } from '../../../../../../src/passes/merge/lib/longhand/decl/boxReducer.js';
import { TextTable } from '../../../../../../src/values/textTable.js';
import {
  aliasedGroup,
  boxGroups,
  boxProperties,
} from '../../../../../../src/passes/merge/lib/longhand/decl/boxGroups.js';
import {
  BoxSupport,
  targetSupportOf,
} from '../../../../../../src/passes/merge/lib/longhand/targetSupport.js';
import {
  allColumnProps,
  reduceColumns,
} from '../../../../../../src/passes/merge/lib/longhand/decl/columns.js';
import {
  commitToNodes,
  declarationsFromNodes,
} from '../../../../../../src/passes/merge/lib/longhand/nodeDeclarations.js';
import { longstandingFeatures } from '../../../../../../src/passes/merge/lib/longhand/syntaxFeatures.js';
import {
  canonicalizeRecords,
  longhandContext,
} from '../../../../../../src/passes/merge/lib/longhand/canonicalize.js';
import { buildRecords } from '../../../../../../src/passes/merge/lib/rules/buildRecords.js';
import { writeBack } from '../../../../../../src/passes/merge/lib/rules/writeBack.js';
import postcss from 'postcss';

/** @import {Container} from 'postcss'; */
/** @import {BlockDeclarations} from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js'; */
/** @import {BoxGroup} from '../../../../../../src/passes/merge/lib/longhand/decl/boxGroups.js'; */
/** @import {BoxDeclarations} from '../../../../../../src/passes/merge/lib/longhand/decl/boxReducer.js'; */

const defaultSupport = new BoxSupport(['ie 11']);

/**
 * Reads the block of a rule, runs a reduction on its list, then writes the
 * block back, as the plugin does for one block.
 *
 * @param {Container} rule
 * @param {(list: BlockDeclarations) => void} reduce
 * @return {void}
 */
export function reduceBlockOf(rule, reduce) {
  const textTable = new TextTable();
  const block = declarationsFromNodes(rule, createRunContext(textTable));
  reduce(block.list);
  commitToNodes(block, textTable);
}

/**
 * Calls a family reducer once for every run of declarations in the block, with
 * the positions and importance lanes that the plugin hands it.
 *
 * @param {BlockDeclarations} list
 * @param {(position: number) => boolean} belongsToFamily
 * @param {(decls: number[], lanes: [number[], number[]]) => void} reduce
 */
function reduceFamilyRuns(list, belongsToFamily, reduce) {
  for (const run of declarationRuns(list)) {
    const decls = run.filter(belongsToFamily);
    if (decls.length > 0) reduce(decls, importanceLanes(list, decls));
  }
}

/**
 * Builds what the plugin hands the box reducer for one run of a group: its
 * properties, and the lanes, which also hold what may alias them.
 *
 * @param {BoxGroup} group
 * @param {number[]} run positions in `list`
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
  reduceBlockOf(rule, (list) => {
    for (const run of declarationRuns(list)) {
      const box = boxDeclarations(group, run, list);
      if (box.decls.length === 0) continue;
      if (box.flow.size === 0) box.flow = null;
      reduceBox(list, box, support, longstandingFeatures);
    }
  });
}

/** @param {Container} rule */
export function reduceColumnsRuns(rule) {
  reduceBlockOf(rule, (list) =>
    reduceFamilyRuns(
      list,
      (p) => allColumnProps.has(list.at(p).prop.toLowerCase()),
      (decls, lanes) => reduceColumns(list, decls, lanes, longstandingFeatures)
    )
  );
}

/** @param {Container} rule */
export function reduceBorderRadiusRuns(rule) {
  reduceBlockOf(rule, (list) =>
    reduceFamilyRuns(
      list,
      (p) => allRadiusProperties.has(list.at(p).prop.toLowerCase()),
      (decls, lanes) =>
        reduceBorderRadius(list, decls, lanes, longstandingFeatures)
    )
  );
}

/**
 * @param {BlockDeclarations} list
 * @return {boolean} whether a declaration outside the physical border family
 * could cascade with it
 */
function hasForeignBorder(list) {
  for (let p = 0; p < list.length; p++) {
    const item = list.at(p);
    if (isAll(item)) return true;
    const prop = item.prop.toLowerCase();
    if (
      prop.startsWith('border-') &&
      prop !== 'border-spacing' &&
      !allRadiusProperties.has(prop) &&
      !allPhysicalBorderProperties.has(prop)
    ) {
      return true;
    }
  }
  return false;
}

/** @param {Container} rule */
export function reduceBorderRuns(rule) {
  reduceBlockOf(rule, (list) => {
    const foreign = hasForeignBorder(list);
    reduceFamilyRuns(
      list,
      (p) => allPhysicalBorderProperties.has(list.at(p).prop.toLowerCase()),
      (decls) => reduceBorder(list, decls, foreign, longstandingFeatures)
    );
  });
}

/**
 * Runs the second longhand round on the records of a stylesheet's text, writes
 * the records back, and returns the text, as the merge pass does after its
 * merges.
 *
 * @param {string} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @return {string}
 */
export function secondRoundOfText(css, browsers) {
  const root = postcss.parse(css);
  const support = targetSupportOf(browsers);
  const run = createRunContext(new TextTable(), undefined, support.features);
  const { records, nodes } = buildRecords(root, run);
  const context = longhandContext(
    support.placeShorthands,
    support.boxSupport,
    support.pairShorthands,
    run,
    records
  );
  canonicalizeRecords(records, context);
  writeBack(records, nodes, run.tokenLists, run.textTable);
  return root.toString();
}
