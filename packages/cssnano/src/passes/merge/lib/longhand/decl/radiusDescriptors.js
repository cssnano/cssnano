import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
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

const { asciiLowerCase } = cssnanoUtils;

/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js'; */

/**
 * Intermediate Representation (IR) descriptor for a declaration in the border-radius family.
 *
 * @typedef {object} RadiusDeclarationDescriptor
 * @property {number} decl the position of the declaration in its list
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
 * @param {number} position
 * @param {DeclarationItem} node
 * @param {string} prop
 * @param {boolean} isHacked
 * @return {RadiusDeclarationDescriptor | null}
 */
function createRadiusDescriptor(position, node, prop, isHacked) {
  const isShorthand = prop === 'border-radius';
  const longhandIndex = isShorthand
    ? -1
    : (longhandIndexByName.get(prop) ?? -1);

  if (isHacked) {
    return {
      decl: position,
      prop,
      val: node.value,
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

  const val = node.value;
  const isGlobal = isGlobalKeyword(val);

  let parsed = null;
  if (!isGlobal) {
    const tokens = node.tokens;
    parsed = isShorthand
      ? parseRadiusShorthand(val, tokens)
      : parseCornerRadius(val, tokens);
    if (parsed === null) return null;
  }

  return {
    decl: position,
    prop,
    val,
    isBarrier: false,
    isHacked: false,
    isGlobalKeyword: isGlobal,
    isShorthand,
    longhandIndex,
    canExplode: isShorthand ? canExplode(node) : false,
    parsed,
  };
}

/**
 * Appends a declaration's descriptor to lanes or returns false on invalid syntax.
 * @param {BlockDeclarations} list
 * @param {number} position
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 * @param {RadiusDeclarationDescriptor[]} radiusDescriptors
 * @return {boolean}
 */
function appendRadiusNode(list, position, lanes, radiusDescriptors) {
  const node = list.at(position);
  const laneIndex = node.important ? 1 : 0;
  if (isAll(node)) {
    lanes[laneIndex].push({ decl: position, isBarrier: true });
    return true;
  }
  const prop = asciiLowerCase(node.prop);
  const isHacked = Boolean(hasHack(node.before, node.prop, node.value));
  const desc = createRadiusDescriptor(position, node, prop, isHacked);
  if (!desc) return false;
  lanes[laneIndex].push(desc);
  radiusDescriptors.push(desc);
  return true;
}

/**
 * Partitions family lanes into descriptor lanes.
 * @param {BlockDeclarations} list
 * @param {[number[], number[]]} familyLanes
 * @return {{ lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]], radiusDescriptors: RadiusDeclarationDescriptor[] } | null}
 */
export function partitionLanes(list, familyLanes) {
  /** @type {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} */
  const lanes = [[], []];
  /** @type {RadiusDeclarationDescriptor[]} */
  const radiusDescriptors = [];

  for (const lane of familyLanes) {
    for (const position of lane) {
      if (
        !list.at(position).removed &&
        !appendRadiusNode(list, position, lanes, radiusDescriptors)
      ) {
        return null;
      }
    }
  }
  return radiusDescriptors.length ? { lanes, radiusDescriptors } : null;
}
