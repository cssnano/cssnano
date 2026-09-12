import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import isCustomProp from '../isCustomProp.js';
import insertCloned from '../insertCloned.js';
import minifyTrbl from '../minifyTrbl.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import { isAll } from './importanceLanes.js';
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

/** @import {Declaration, Rule} from 'postcss'; */

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
 * Writes a component value to the target slot vector and registers fallback dependence edges.
 *
 * @param {({ value: string, decl: Declaration } | null)[]} slotVector
 * @param {number} idx
 * @param {string} value
 * @param {Declaration} decl
 * @param {Set<Declaration>} fallbackDefinitions
 */
function assignSlot(slotVector, idx, value, decl, fallbackDefinitions) {
  const existing = slotVector[idx];
  if (existing && isFallback(existing.decl, decl)) {
    fallbackDefinitions.add(existing.decl);
  }
  slotVector[idx] = { value, decl };
}

/**
 * Synthesizes and commits a merged shorthand declaration if cost-model benefit is non-negative.
 *
 * @param {Rule} rule
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
  if (slotVector.some((s) => !s || isCustomProp(s.decl))) return;
  const full = /** @type {{ value: string, decl: Declaration }[]} */ (
    slotVector
  );
  const s0 = mergeBlockingSupport(full[0].decl);

  /* Preserve CSS-wide keywords without merging to respect author inheritance contracts */
  if (full.some((s) => isGlobalKeyword(s.value))) return;

  for (const s of full) {
    if (s0.symmetricDifference(mergeBlockingSupport(s.decl)).size) return;
  }

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

  const toRemove = Array.from(liveDefinitions).filter(
    (d) => !fallbackDefinitions.has(d)
  );
  if (toRemove.length === 0) return;
  if (
    toRemove.length === 1 &&
    toRemove[0].prop.toLowerCase() === 'border-radius'
  ) {
    toRemove[0].prop = 'border-radius';
    toRemove[0].value = shorthandVal;
    if (toRemove[0].raws) delete toRemove[0].raws.value;
    return;
  }

  let sizeBenefit = -(
    'border-radius'.length +
    shorthandVal.length +
    2 +
    (isImportant ? 10 : 0)
  );
  for (const d of toRemove) {
    sizeBenefit += d.prop.length + d.value.length + (d.important ? 12 : 2);
  }

  if (sizeBenefit >= 0) {
    let a = toRemove[0];
    for (const d of toRemove) if (rule.index(d) > rule.index(a)) a = d;
    insertCloned(rule, a, {
      prop: 'border-radius',
      value: shorthandVal,
      important: isImportant,
    });
    for (const d of toRemove) d.remove();
  }
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
    assignSlot(
      slotVector,
      i * 2,
      parsed.horizontal[i],
      decl,
      fallbackDefinitions
    );
    assignSlot(
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
    assignSlot(slotVector, idx * 2, decl.value, decl, fallbackDefinitions);
    assignSlot(slotVector, idx * 2 + 1, decl.value, decl, fallbackDefinitions);
    liveDefinitions.add(decl);
    return true;
  }
  const parsed = /** @type {ReturnType<typeof parseCornerRadius>} */ (
    desc.parsed
  );
  if (!parsed) return false;

  assignSlot(slotVector, idx * 2, parsed[0], decl, fallbackDefinitions);
  assignSlot(slotVector, idx * 2 + 1, parsed[1], decl, fallbackDefinitions);
  liveDefinitions.add(decl);
  return true;
}

/**
 * Executes greedy vector coalescing over a lane's IR descriptors.
 *
 * @param {Rule} rule
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
 * @param {Declaration} node
 * @param {string} prop
 * @param {Declaration[] | undefined} live
 * @param {number} liveIndex
 * @return {boolean}
 */
function isTargetDeclaration(node, prop, live, liveIndex) {
  if (live) return liveIndex < live.length && node === live[liveIndex];
  return allRadiusProperties.has(prop);
}

/**
 * Frontend scan: lexes, validates, and partitions declarations into lane IR descriptors.
 * Fails fast and returns null if any declaration violates syntax or domain grammar.
 *
 * @param {Rule} rule
 * @param {Declaration[]} [declarations]
 * @return {{ lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]], radiusDescriptors: RadiusDeclarationDescriptor[] } | null}
 */
function scanAndPartitionDeclarations(rule, declarations) {
  if (!rule.nodes || rule.nodes.length === 0) return null;
  if (declarations && declarations.length === 0) return null;

  const live = declarations
    ? declarations.filter((d) => d.parent === rule)
    : undefined;
  if (live && live.length === 0) return null;

  /** @type {[RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]]} */
  const lanes = [[], []];
  /** @type {RadiusDeclarationDescriptor[]} */
  const radiusDescriptors = [];
  let liveIndex = 0;

  for (const node of rule.nodes) {
    if (node.type !== 'decl') continue;

    const laneIndex = node.important ? 1 : 0;
    if (isAll(node)) {
      lanes[laneIndex].push({ decl: node, isBarrier: true });
      continue;
    }

    const prop = node.prop.toLowerCase();
    if (!isTargetDeclaration(node, prop, live, liveIndex)) continue;
    if (live) liveIndex++;

    const isHacked = Boolean(stylehacks.detect(node));
    const desc = createRadiusDescriptor(node, prop, isHacked);
    if (!desc) return null;

    lanes[laneIndex].push(desc);
    radiusDescriptors.push(desc);
  }

  if (live && liveIndex < live.length) return null;
  if (radiusDescriptors.length === 0) return null;

  return { lanes, radiusDescriptors };
}

/**
 * @param {Rule} rule
 * @param {Declaration[]} [declarations]
 */
export function reduceBorderRadius(rule, declarations) {
  const partitioned = scanAndPartitionDeclarations(rule, declarations);
  if (!partitioned) return;

  const { lanes, radiusDescriptors } = partitioned;

  eliminateRedundantDeclarations(lanes);

  const liveDecls = radiusDescriptors.filter((d) => d.decl.parent);
  if (liveDecls.length <= 1) {
    if (liveDecls[0]) canonicalizeSingleton(liveDecls[0]);
    return;
  }

  for (const isImportant of [false, true]) {
    const laneDescriptors = lanes[isImportant ? 1 : 0];
    if (laneDescriptors.some((d) => !d.isBarrier && d.decl.parent === rule)) {
      coalesceLane(rule, laneDescriptors, isImportant);
    }
  }
}
