import cssnanoUtils from '#utils';
import { detectDeclaration } from '#stylehacks';
import canExplode from '../canExplode.js';
import { isAll } from './importanceLanes.js';
import {
  parseCornerRadius,
  parseRadiusShorthand,
  isGlobalKeyword,
} from '../validateRadius.js';
import {
  physicalRadiusLonghands,
  physicalRadiusProperties,
} from './borderData.js';

const { asciiLowerCase, sourceValue } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */

/**
 * Intermediate Representation (IR) descriptor for a declaration in the border-radius family.
 *
 * @typedef {object} RadiusDeclarationDescriptor
 * @property {Declaration} decl
 * @property {string} [prop]
 * @property {string} [val]
 * @property {boolean} isBarrier
 * @property {boolean} [isHacked]
 * @property {boolean} [isGlobalKeyword]
 * @property {boolean} [isShorthand]
 * @property {number} [longhandIndex]
 * @property {boolean} [canExplode]
 * @property {ReturnType<typeof parseRadiusShorthand> | ReturnType<typeof parseCornerRadius> | null} [parsed]
 */

/** @type {Map<string, number>} */
const longhandIndexByName = new Map(
  physicalRadiusLonghands.map((name, index) => [name, index])
);

/**
 * Creates an IR descriptor for a radius declaration.
 * Returns null if the declaration violates syntax or domain grammar.
 *
 * @param {Declaration} node
 * @param {string} prop
 * @param {boolean} isHacked
 * @return {RadiusDeclarationDescriptor | null}
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function createRadiusDescriptor(node, prop, isHacked, textTable) {
  const isShorthand = prop === 'border-radius';
  const longhandIndex = isShorthand
    ? -1
    : (longhandIndexByName.get(prop) ?? -1);

  if (isHacked) {
    return {
      decl: node,
      prop,
      val: sourceValue(node),
      isBarrier: false,
      isHacked: true,
      isGlobalKeyword: false,
      isShorthand,
      longhandIndex,
      canExplode: false,
      parsed: null,
    };
  }

  if (!physicalRadiusProperties.has(prop)) {
    return null;
  }

  const val = sourceValue(node);
  const isGlobal = isGlobalKeyword(val);

  let parsed = null;
  if (!isGlobal) {
    const list = textTable.tokens(node);
    parsed = isShorthand
      ? parseRadiusShorthand(val, list)
      : parseCornerRadius(val, list);
    if (parsed === null) return null;
  }

  return {
    decl: node,
    prop,
    val,
    isBarrier: false,
    isHacked: false,
    isGlobalKeyword: isGlobal,
    isShorthand,
    longhandIndex,
    canExplode: isShorthand ? canExplode(node, textTable) : false,
    parsed,
  };
}

/**
 * Appends a node descriptor to lanes or returns false on invalid syntax.
 * @param {Declaration} node
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 * @param {RadiusDeclarationDescriptor[]} radiusDescriptors
 * @return {boolean}
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function appendRadiusNode(node, lanes, radiusDescriptors, textTable) {
  const laneIndex = node.important ? 1 : 0;
  if (isAll(node)) {
    lanes[laneIndex].push({ decl: node, isBarrier: true });
    return true;
  }
  const prop = asciiLowerCase(node.prop);
  const isHacked = Boolean(detectDeclaration(node));
  const desc = createRadiusDescriptor(node, prop, isHacked, textTable);
  if (!desc) return false;
  lanes[laneIndex].push(desc);
  radiusDescriptors.push(desc);
  return true;
}

/**
 * Partitions family lanes into descriptor lanes.
 * @param {Container} rule
 * @param {[Declaration[], Declaration[]]} familyLanes
 * @return {{ lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]], radiusDescriptors: RadiusDeclarationDescriptor[] } | null}
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
export function partitionLanes(rule, familyLanes, textTable) {
  /** @type {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} */
  const lanes = [[], []];
  /** @type {RadiusDeclarationDescriptor[]} */
  const radiusDescriptors = [];

  for (const lane of familyLanes) {
    for (const node of lane) {
      if (
        node.parent === rule &&
        !appendRadiusNode(node, lanes, radiusDescriptors, textTable)
      ) {
        return null;
      }
    }
  }
  return radiusDescriptors.length ? { lanes, radiusDescriptors } : null;
}
