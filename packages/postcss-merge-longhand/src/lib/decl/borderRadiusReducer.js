import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import isCustomProp from '../isCustomProp.js';
import insertCloned from '../insertCloned.js';
import minifyTrbl from '../minifyTrbl.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import {
  parseCornerRadius,
  parseRadiusShorthand,
  isGlobalKeyword,
} from '../validateRadius.js';
import {
  physicalRadiusLonghands,
  physicalRadiusProperties,
  logicalRadiusProperties,
} from './borderData.js';

/** @import {Declaration, Rule} from 'postcss'; */

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx
 * @param {string} value
 * @param {Declaration} decl
 * @param {Set<Declaration>} fallbacks
 */
function setSlot(slots, idx, value, decl, fallbacks) {
  const existing = slots[idx];
  if (existing && isFallback(existing.decl, decl)) {
    fallbacks.add(existing.decl);
  }
  slots[idx] = { value, decl };
}

/**
 * @param {Rule} rule
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {boolean} lane
 */
function flush(rule, slots, contributing, fallbacks, lane) {
  if (slots.some((s) => !s || isCustomProp(s.decl))) return;
  const full = /** @type {{ value: string, decl: Declaration }[]} */ (slots);
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

  const toRemove = Array.from(contributing).filter((d) => !fallbacks.has(d));
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

  let remSize = -(
    'border-radius'.length +
    shorthandVal.length +
    2 +
    (lane ? 10 : 0)
  );
  for (const d of toRemove) {
    remSize += d.prop.length + d.value.length + (d.important ? 12 : 2);
  }

  if (remSize >= 0) {
    let a = toRemove[0];
    for (const d of toRemove) if (rule.index(d) > rule.index(a)) a = d;
    insertCloned(rule, a, {
      prop: 'border-radius',
      value: shorthandVal,
      important: lane,
    });
    for (const d of toRemove) d.remove();
  }
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {number} idx
 * @param {Declaration} decl
 */
function shouldReset(slots, idx, decl) {
  if (!slots.every(Boolean)) return false;
  const isFb = (/** @type {{decl: Declaration} | null} */ s) =>
    Boolean(s && isFallback(s.decl, decl));
  if (idx === -1) return slots.some(isFb);
  return (
    isGlobalKeyword(decl.value) ||
    isFb(slots[idx * 2]) ||
    isFb(slots[idx * 2 + 1])
  );
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {Declaration} decl
 * @param {string} val
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {(d: Declaration) => ReturnType<typeof parseRadiusShorthand>} getShorthand
 * @return {boolean} false if invalid and should reset
 */
function applyShorthand(
  slots,
  decl,
  val,
  contributing,
  fallbacks,
  getShorthand
) {
  if (isGlobalKeyword(val)) {
    for (let i = 0; i < 8; i++) {
      setSlot(slots, i, decl.value, decl, fallbacks);
    }
    contributing.add(decl);
    return true;
  }
  const parsed = getShorthand(decl);
  if (!parsed) return false;
  for (let i = 0; i < 4; i++) {
    setSlot(slots, i * 2, parsed.horizontal[i], decl, fallbacks);
    setSlot(slots, i * 2 + 1, parsed.vertical[i], decl, fallbacks);
  }
  contributing.add(decl);
  return true;
}

/**
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {Declaration} decl
 * @param {string} val
 * @param {number} idx
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {(d: Declaration) => ReturnType<typeof parseCornerRadius>} getCorner
 * @return {boolean} false if invalid and should reset
 */
function applyLonghand(
  slots,
  decl,
  val,
  idx,
  contributing,
  fallbacks,
  getCorner
) {
  if (isGlobalKeyword(val)) {
    setSlot(slots, idx * 2, decl.value, decl, fallbacks);
    setSlot(slots, idx * 2 + 1, decl.value, decl, fallbacks);
    contributing.add(decl);
    return true;
  }
  const parsed = getCorner(decl);
  if (!parsed) return false;

  setSlot(slots, idx * 2, parsed[0], decl, fallbacks);
  setSlot(slots, idx * 2 + 1, parsed[1], decl, fallbacks);
  contributing.add(decl);
  return true;
}

/**
 * @param {Rule} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} lane
 * @param {(d: Declaration) => ReturnType<typeof parseCornerRadius>} getCorner
 * @param {(d: Declaration) => ReturnType<typeof parseRadiusShorthand>} getShorthand
 */
function processLane(rule, laneDecls, lane, getCorner, getShorthand) {
  /** @type {({ value: string, decl: Declaration } | null)[]} */
  let slots = [null, null, null, null, null, null, null, null];
  const contributing = new Set();
  const fallbacks = new Set();

  const reset = () => {
    flush(rule, slots, contributing, fallbacks, lane);
    slots = [null, null, null, null, null, null, null, null];
    contributing.clear();
    fallbacks.clear();
  };

  for (const decl of laneDecls) {
    const p = decl.prop.toLowerCase();
    const isShort = p === 'border-radius';

    if (stylehacks.detect(decl) || (isShort && !canExplode(decl))) {
      reset();
      continue;
    }

    const idx = isShort ? -1 : physicalRadiusLonghands.indexOf(p);
    if (idx === -1 && !isShort) {
      reset();
      continue;
    }

    if (shouldReset(slots, idx, decl)) reset();
    const val = decl.raws?.value?.raw ?? decl.value;

    const ok = isShort
      ? applyShorthand(slots, decl, val, contributing, fallbacks, getShorthand)
      : applyLonghand(
          slots,
          decl,
          val,
          idx,
          contributing,
          fallbacks,
          getCorner
        );

    if (!ok) reset();
  }

  flush(rule, slots, contributing, fallbacks, lane);
}

/**
 * @param {Declaration} s
 * @param {(d: Declaration) => ReturnType<typeof parseCornerRadius>} getCorner
 * @param {(d: Declaration) => ReturnType<typeof parseRadiusShorthand>} getShorthand
 */
function normalizeSingleton(s, getCorner, getShorthand) {
  if (!s || stylehacks.detect(s)) return;
  const val = s.raws?.value?.raw ?? s.value;
  if (isGlobalKeyword(val)) return;
  const p = s.prop.toLowerCase();
  if (p === 'border-radius' && canExplode(s)) {
    const parsed = getShorthand(s);
    if (parsed) {
      const h = minifyTrbl(parsed.horizontal);
      const v = minifyTrbl(parsed.vertical);
      s.prop = 'border-radius';
      s.value = h === v ? h : `${h}/${v}`;
      if (s.raws) delete s.raws.value;
    }
  } else if (physicalRadiusLonghands.includes(p)) {
    const parsed = getCorner(s);
    if (parsed && parsed[0] === parsed[1]) {
      s.prop = p;
      s.value = parsed[0];
      if (s.raws) delete s.raws.value;
    }
  }
}

/**
 * @param {Rule} rule
 * @param {Declaration[]} [declarations]
 */
export function reduceBorderRadius(rule, declarations) {
  if (!rule.nodes) return;
  const decls =
    declarations ??
    /** @type {Declaration[]} */ (
      rule.nodes.filter(
        (n) =>
          n.type === 'decl' &&
          physicalRadiusProperties.has(n.prop.toLowerCase())
      )
    );

  /** @type {Map<Declaration, ReturnType<typeof parseCornerRadius>>} */
  const cornerCache = new Map();
  /** @type {Map<Declaration, ReturnType<typeof parseRadiusShorthand>>} */
  const shorthandCache = new Map();

  const getCorner = (/** @type {Declaration} */ d) => {
    let cached = cornerCache.get(d);
    if (cached === undefined) {
      const val = d.raws?.value?.raw ?? d.value;
      cached = parseCornerRadius(val);
      cornerCache.set(d, cached);
    }
    return cached;
  };

  const getShorthand = (/** @type {Declaration} */ d) => {
    let cached = shorthandCache.get(d);
    if (cached === undefined) {
      const val = d.raws?.value?.raw ?? d.value;
      cached = parseRadiusShorthand(val);
      shorthandCache.set(d, cached);
    }
    return cached;
  };

  const isInvalid = (/** @type {Declaration} */ d) => {
    if (stylehacks.detect(d)) return false;
    const p = d.prop.toLowerCase();
    if (logicalRadiusProperties.has(p) || !physicalRadiusProperties.has(p)) {
      return true;
    }
    const val = d.raws?.value?.raw ?? d.value;
    if (isGlobalKeyword(val)) return false;
    if (p === 'border-radius') {
      return getShorthand(d) === null;
    }
    return getCorner(d) === null;
  };

  if (decls.length === 0 || decls.some(isInvalid)) return;

  cleanupDeclarations(new Set(decls), () => false);

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    if (live[0]) normalizeSingleton(live[0], getCorner, getShorthand);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = live.filter((d) => Boolean(d.important) === lane);
    if (laneDecls.length) {
      processLane(rule, laneDecls, lane, getCorner, getShorthand);
    }
  }
}
