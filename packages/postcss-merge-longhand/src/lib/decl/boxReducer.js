import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import isCustomProp from '../isCustomProp.js';
import insertCloned from '../insertCloned.js';
import minifyTrbl from '../minifyTrbl.js';
import parseTrbl from '../parseTrbl.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import { browserKeeps } from '../validateBox.js';
import { isFallback, mergeBlockingSupport } from '../isFallback.js';
import topRightBottomLeft from '../trbl.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import {
  cleanupLaneSegments,
  importanceLanes,
  isAll,
} from './importanceLanes.js';

/** @import {Declaration, Rule} from 'postcss'; */

/** @param {Declaration} d */
const isInvalid = (d) =>
  !stylehacks.detect(d) &&
  !cssGlobalKeywords.has(d.value.toLowerCase()) &&
  !browserKeeps(d.prop.toLowerCase(), d.value);

/** @param {Rule} rule @param {string} prop @param {({ value: string, decl: Declaration } | null)[]} slots @param {Set<Declaration>} contributing @param {Set<Declaration>} fallbacks @param {boolean} lane */

function flush(rule, prop, slots, contributing, fallbacks, lane) {
  if (slots.some((s) => !s || isCustomProp(s.decl))) return;
  const full = /** @type {{ value: string, decl: Declaration }[]} */ (slots);
  const s0 = mergeBlockingSupport(full[0].decl);
  const v0 = full[0].value.toLowerCase();
  const kw = cssGlobalKeywords.has(v0);
  for (const s of full) {
    const sv = s.value.toLowerCase();
    if (kw ? sv !== v0 : cssGlobalKeywords.has(sv)) return;
    if (s0.symmetricDifference(mergeBlockingSupport(s.decl)).size) return;
  }

  const rawValues = full.map((s) => s.value).join(' ');
  const shorthandVal = kw ? full[0].value : minifyTrbl(rawValues);
  const toRemove = Array.from(contributing).filter((d) => !fallbacks.has(d));
  if (toRemove.length === 0) return;
  if (toRemove.length === 1 && toRemove[0].prop.toLowerCase() === prop) {
    toRemove[0].prop = prop;
    toRemove[0].value = shorthandVal;
    return;
  }
  let remSize = -(prop.length + shorthandVal.length + 2 + (lane ? 10 : 0));
  for (const d of toRemove)
    remSize += d.prop.length + d.value.length + (d.important ? 12 : 2);
  if (remSize >= 0) {
    let a = toRemove[0];
    for (const d of toRemove) if (rule.index(d) > rule.index(a)) a = d;
    insertCloned(rule, a, { prop, value: shorthandVal, important: lane });
    for (const d of toRemove) d.remove();
  }
}

/** @param {({ value: string, decl: Declaration } | null)[]} slots @param {number} idx @param {Declaration} decl */
function shouldReset(slots, idx, decl) {
  if (!slots.every(Boolean)) return false;
  const isFb = (/** @type {{decl: Declaration} | null} */ s) =>
    Boolean(s && isFallback(s.decl, decl));
  if (idx === -1) return slots.some(isFb);
  return cssGlobalKeywords.has(decl.value.toLowerCase()) || isFb(slots[idx]);
}

/** @param {Rule} rule @param {string} prop @param {string[]} sideProps @param {Declaration[]} laneDecls @param {boolean} lane */
function processLane(rule, prop, sideProps, laneDecls, lane) {
  /** @type {({ value: string, decl: Declaration } | null)[]} */
  let slots = [null, null, null, null];
  const contributing = new Set(),
    fallbacks = new Set();
  const reset = () => {
    flush(rule, prop, slots, contributing, fallbacks, lane);
    slots = [null, null, null, null];
    contributing.clear();
    fallbacks.clear();
  };

  for (const decl of laneDecls) {
    const p = decl.prop.toLowerCase();
    if (isAll(decl)) {
      reset();
      continue;
    }
    const isShort = p === prop;
    if (stylehacks.detect(decl) || (isShort && !canExplode(decl))) {
      reset();
      continue;
    }
    const idx = isShort ? -1 : sideProps.indexOf(p);
    if (shouldReset(slots, idx, decl)) reset();

    const vals = isShort ? parseTrbl(decl.value) : null;
    for (let i = 0; i < 4; i++) {
      if (isShort || i === idx) {
        const s = slots[i];
        if (s && isFallback(s.decl, decl)) fallbacks.add(s.decl);
        slots[i] = { value: vals ? vals[i] : decl.value, decl };
      }
    }
    contributing.add(decl);
  }
  flush(rule, prop, slots, contributing, fallbacks, lane);
}

/** @param {Rule} rule @param {string} prop @param {Declaration[]} [declarations] */
export function reduceBox(rule, prop, declarations) {
  if (!rule.nodes) return;
  const sideProps = topRightBottomLeft.map((d) => `${prop}-${d}`);
  const family = new Set([prop, ...sideProps]);
  const decls =
    declarations ??
    /** @type {Declaration[]} */ (
      rule.nodes.filter(
        (n) => n.type === 'decl' && family.has(n.prop.toLowerCase())
      )
    );

  if (decls.length === 0 || decls.some(isInvalid)) return;

  const lanes = importanceLanes(rule, decls);
  cleanupLaneSegments(lanes, (segment) => cleanupDeclarations(segment));

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    const s = live[0];
    const isTarget = s?.prop.toLowerCase() === prop;
    if (isTarget && !stylehacks.detect(s) && canExplode(s)) {
      s.prop = prop;
      s.value = minifyTrbl(s.value);
    }
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = lanes[lane ? 1 : 0].filter((d) => d.parent === rule);
    if (laneDecls.some((d) => !isAll(d))) {
      processLane(rule, prop, sideProps, laneDecls, lane);
    }
  }
}
