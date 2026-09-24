import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import minifyTrbl from '../minifyTrbl.js';
import { isFallback } from '../isFallback.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import { importanceLanes, isAll } from './importanceLanes.js';
import {
  assignSlotValue,
  commitShorthand,
  slotVectorReady,
  supportProvenanceMatches,
} from './slotVector.js';
import {
  parseCornerRadius,
  parseRadiusShorthand,
  isGlobalKeyword,
} from '../validateRadius.js';
import {
  allRadiusProperties,
  physicalRadiusLonghands,
  physicalRadiusProperties,
  logicalRadiusProperties,
} from './borderData.js';

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

/**
 * Synthesizes and commits a merged shorthand declaration if cost-model benefit is non-negative.
 *
 * @param {Container} rule
 * @param {({ value: string, decl: Declaration } | null)[]} slotVector
 * @param {Set<Declaration>} liveDefinitions
 * @param {Set<Declaration>} fallbackDefinitions
 * @param {boolean} isImportant
 */
function commitSlotVector(
  rule,
  slotVector,
  liveDefinitions,
  fallbackDefinitions,
  isImportant
) {
  const full = slotVectorReady(slotVector);
  if (!full) return;

  /* Preserve CSS-wide keywords without merging to respect author inheritance contracts */
  if (full.some((s) => isGlobalKeyword(s.value))) return;

  if (!supportProvenanceMatches(full)) return;

  const horizontal = minifyTrbl([
    full[0].value,
    full[2].value,
    full[4].value,
    full[6].value,
  ]);
  const vertical = minifyTrbl([
    full[1].value,
    full[3].value,
    full[5].value,
    full[7].value,
  ]);
  const shorthandVal =
    horizontal === vertical ? horizontal : `${horizontal}/${vertical}`;

  commitShorthand(rule, full, liveDefinitions, fallbackDefinitions, {
    prop: 'border-radius',
    value: shorthandVal,
    important: isImportant,
  });
}

/**
 * Evaluates hazard detection: returns true if active slots must be flushed and reset.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slotVector
 * @param {number} idx
 * @param {RadiusDeclarationDescriptor} desc
 * @return {boolean}
 */
function shouldInvalidateSlots(slotVector, idx, desc) {
  if (!slotVector.every(Boolean)) return false;
  const isFb = (/** @type {{decl: Declaration} | null} */ s) =>
    Boolean(s && isFallback(s.decl, desc.decl));
  if (idx === -1) return slotVector.some(isFb);
  return (
    Boolean(desc.isGlobalKeyword) ||
    isFb(slotVector[idx * 2]) ||
    isFb(slotVector[idx * 2 + 1])
  );
}

/**
 * Assigns all 8 slot registers from a shorthand vector declaration.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slotVector
 * @param {RadiusDeclarationDescriptor} desc
 * @param {Set<Declaration>} liveDefinitions
 * @param {Set<Declaration>} fallbackDefinitions
 * @return {boolean}
 */
function accumulateShorthand(
  slotVector,
  desc,
  liveDefinitions,
  fallbackDefinitions
) {
  const parsed = /** @type {ReturnType<typeof parseRadiusShorthand>} */ (
    desc.parsed
  );
  if (!parsed) return false;
  const decl = desc.decl;
  for (let i = 0; i < 4; i++) {
    assignSlotValue(
      slotVector,
      i * 2,
      parsed.horizontal[i],
      decl,
      fallbackDefinitions
    );
    assignSlotValue(
      slotVector,
      i * 2 + 1,
      parsed.vertical[i],
      decl,
      fallbackDefinitions
    );
  }
  liveDefinitions.add(decl);
  return true;
}

/**
 * Assigns paired slot registers from a scalar corner longhand declaration.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slotVector
 * @param {RadiusDeclarationDescriptor} desc
 * @param {number} idx
 * @param {Set<Declaration>} liveDefinitions
 * @param {Set<Declaration>} fallbackDefinitions
 * @return {boolean}
 */
function accumulateCorner(
  slotVector,
  desc,
  idx,
  liveDefinitions,
  fallbackDefinitions
) {
  const decl = desc.decl;
  if (desc.isGlobalKeyword) {
    assignSlotValue(slotVector, idx * 2, decl.value, decl, fallbackDefinitions);
    assignSlotValue(
      slotVector,
      idx * 2 + 1,
      decl.value,
      decl,
      fallbackDefinitions
    );
    liveDefinitions.add(decl);
    return true;
  }
  const parsed = /** @type {ReturnType<typeof parseCornerRadius>} */ (
    desc.parsed
  );
  if (!parsed) return false;

  assignSlotValue(slotVector, idx * 2, parsed[0], decl, fallbackDefinitions);
  assignSlotValue(
    slotVector,
    idx * 2 + 1,
    parsed[1],
    decl,
    fallbackDefinitions
  );
  liveDefinitions.add(decl);
  return true;
}

/**
 * Executes greedy vector coalescing over a lane's IR descriptors.
 *
 * @param {Container} rule
 * @param {RadiusDeclarationDescriptor[]} laneDescriptors
 * @param {boolean} isImportant
 */
function coalesceLane(rule, laneDescriptors, isImportant) {
  /** @type {({ value: string, decl: Declaration } | null)[]} */
  let slotVector = [null, null, null, null, null, null, null, null];
  const liveDefinitions = new Set();
  const fallbackDefinitions = new Set();

  const commitAndResetSlots = () => {
    commitSlotVector(
      rule,
      slotVector,
      liveDefinitions,
      fallbackDefinitions,
      isImportant
    );
    slotVector = [null, null, null, null, null, null, null, null];
    liveDefinitions.clear();
    fallbackDefinitions.clear();
  };

  for (const desc of laneDescriptors) {
    if (desc.decl.parent !== rule) continue;

    if (desc.isBarrier) {
      commitAndResetSlots();
      continue;
    }

    if (desc.isHacked || (desc.isShorthand && !desc.canExplode)) {
      commitAndResetSlots();
      continue;
    }

    const idx = desc.isShorthand
      ? -1
      : /** @type {number} */ (desc.longhandIndex);

    if (shouldInvalidateSlots(slotVector, idx, desc)) {
      commitAndResetSlots();
    }

    const ok = desc.isShorthand
      ? accumulateShorthand(
          slotVector,
          desc,
          liveDefinitions,
          fallbackDefinitions
        )
      : accumulateCorner(
          slotVector,
          desc,
          idx,
          liveDefinitions,
          fallbackDefinitions
        );

    if (!ok) commitAndResetSlots();
  }

  commitSlotVector(
    rule,
    slotVector,
    liveDefinitions,
    fallbackDefinitions,
    isImportant
  );
}

/**
 * Applies peephole canonicalization / algebraic folding to a standalone declaration.
 *
 * @param {RadiusDeclarationDescriptor} desc
 */
function canonicalizeSingleton(desc) {
  const {
    decl,
    prop,
    isHacked,
    isGlobalKeyword: isGlobal,
    isShorthand,
    canExplode: explodable,
    parsed,
  } = desc;
  if (isHacked || isGlobal || !parsed) return;
  if (isShorthand && explodable) {
    const shorthandParsed =
      /** @type {NonNullable<ReturnType<typeof parseRadiusShorthand>>} */ (
        parsed
      );
    const h = minifyTrbl(shorthandParsed.horizontal);
    const v = minifyTrbl(shorthandParsed.vertical);
    decl.prop = 'border-radius';
    decl.value = h === v ? h : `${h}/${v}`;
    if (decl.raws) delete decl.raws.value;
  } else if (desc.longhandIndex !== -1) {
    const cornerParsed =
      /** @type {NonNullable<ReturnType<typeof parseCornerRadius>>} */ (parsed);
    if (cornerParsed[0] === cornerParsed[1]) {
      decl.prop = /** @type {string} */ (prop);
      decl.value = cornerParsed[0];
      if (decl.raws) delete decl.raws.value;
    }
  }
}

/**
 * Intra-block dead-store elimination across barrier-delimited segments.
 *
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 */
function eliminateRedundantDeclarations(lanes) {
  for (const lane of lanes) {
    /** @type {Declaration[]} */
    let segmentDecls = [];
    for (const desc of lane) {
      if (desc.isBarrier) {
        if (segmentDecls.length > 1) {
          cleanupDeclarations(new Set(segmentDecls));
        }
        segmentDecls = [];
      } else {
        segmentDecls.push(desc.decl);
      }
    }
    if (segmentDecls.length > 1) {
      cleanupDeclarations(new Set(segmentDecls));
    }
  }
}

/**
 * Creates an IR descriptor for a radius declaration.
 * Returns null if the declaration violates syntax or domain grammar.
 *
 * @param {Declaration} node
 * @param {string} prop
 * @param {boolean} isHacked
 * @return {RadiusDeclarationDescriptor | null}
 */
function createRadiusDescriptor(node, prop, isHacked) {
  const isShorthand = prop === 'border-radius';
  const longhandIndex = isShorthand
    ? -1
    : physicalRadiusLonghands.indexOf(prop);

  if (isHacked) {
    return {
      decl: node,
      prop,
      val: node.raws?.value?.raw ?? node.value,
      isBarrier: false,
      isHacked: true,
      isGlobalKeyword: false,
      isShorthand,
      longhandIndex,
      canExplode: false,
      parsed: null,
    };
  }

  if (
    logicalRadiusProperties.has(prop) ||
    !physicalRadiusProperties.has(prop)
  ) {
    return null;
  }

  const val = node.raws?.value?.raw ?? node.value;
  const isGlobal = isGlobalKeyword(val);

  let parsed = null;
  if (!isGlobal) {
    parsed = isShorthand ? parseRadiusShorthand(val) : parseCornerRadius(val);
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
    canExplode: isShorthand ? canExplode(node) : false,
    parsed,
  };
}

/**
 * Appends a node descriptor to lanes or returns false on invalid syntax.
 * @param {Declaration} node
 * @param {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} lanes
 * @param {RadiusDeclarationDescriptor[]} radiusDescriptors
 * @return {boolean}
 */
function appendRadiusNode(node, lanes, radiusDescriptors) {
  const laneIndex = node.important ? 1 : 0;
  if (isAll(node)) {
    lanes[laneIndex].push({ decl: node, isBarrier: true });
    return true;
  }
  const prop = node.prop.toLowerCase();
  const isHacked = Boolean(stylehacks.detect(node));
  const desc = createRadiusDescriptor(node, prop, isHacked);
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
 */
function partitionLanes(rule, familyLanes) {
  /** @type {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} */
  const lanes = [[], []];
  /** @type {RadiusDeclarationDescriptor[]} */
  const radiusDescriptors = [];

  for (const lane of familyLanes) {
    for (const node of lane) {
      if (
        node.parent === rule &&
        !appendRadiusNode(node, lanes, radiusDescriptors)
      ) {
        return null;
      }
    }
  }
  return radiusDescriptors.length ? { lanes, radiusDescriptors } : null;
}

/**
 * @param {Container} rule
 * @param {Declaration[]} [declarations]
 * @param {[Declaration[], Declaration[]]} [lanes]
 */
export function reduceBorderRadius(rule, declarations, lanes) {
  if (!rule.nodes || rule.nodes.length === 0) return;
  const decls =
    declarations &&
    declarations.every(
      (d) => d.parent === rule && allRadiusProperties.has(d.prop.toLowerCase())
    )
      ? declarations
      : /** @type {Declaration[]} */ (
          rule.nodes.filter(
            (n) =>
              n.type === 'decl' && allRadiusProperties.has(n.prop.toLowerCase())
          )
        );
  if (decls.length === 0) return;

  if (!lanes && declarations) {
    let index = 0;
    for (const node of rule.nodes) {
      if (index < decls.length && node === decls[index]) index++;
    }
    if (index < decls.length) return;
  }

  const familyLanes = lanes ?? importanceLanes(rule, decls);
  const partitioned = partitionLanes(rule, familyLanes);
  if (!partitioned) return;

  const { lanes: descriptorLanes, radiusDescriptors } = partitioned;

  eliminateRedundantDeclarations(descriptorLanes);

  const liveDecls = radiusDescriptors.filter((d) => d.decl.parent);
  if (liveDecls.length <= 1) {
    if (liveDecls[0]) canonicalizeSingleton(liveDecls[0]);
    return;
  }

  for (const isImportant of [false, true]) {
    const laneDescriptors = descriptorLanes[isImportant ? 1 : 0];
    if (laneDescriptors.some((d) => !d.isBarrier && d.decl.parent === rule)) {
      coalesceLane(rule, laneDescriptors, isImportant);
    }
  }
}
