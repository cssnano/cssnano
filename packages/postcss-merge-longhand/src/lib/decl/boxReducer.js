import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import minifyTrbl from '../minifyTrbl.js';
import parseTrbl from '../parseTrbl.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import { browserKeeps } from '../validateBox.js';
import topRightBottomLeft from '../trbl.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import {
  assignSlotValue,
  commitShorthand,
  shouldResetSlots,
  slotVectorReady,
  supportProvenanceMatches,
} from './slotVector.js';
import {
  cleanupLaneSegments,
  importanceLanes,
  isAll,
} from './importanceLanes.js';

export const physicalMarginProperties = new Set([
  'margin',
  ...topRightBottomLeft.map((d) => `margin-${d}`),
]);

export const physicalPaddingProperties = new Set([
  'padding',
  ...topRightBottomLeft.map((d) => `padding-${d}`),
]);

/** @import {Container, Declaration} from 'postcss'; */

/** @param {Declaration} d */
const isInvalid = (d) =>
  !stylehacks.detect(d) &&
  !cssGlobalKeywords.has(d.value.toLowerCase()) &&
  !browserKeeps(d.prop.toLowerCase(), d.value);

/** @param {Container} rule @param {string} prop @param {({ value: string, decl: Declaration } | null)[]} slots @param {Set<Declaration>} contributing @param {Set<Declaration>} fallbacks @param {boolean} lane */

function flush(rule, prop, slots, contributing, fallbacks, lane) {
  const full = slotVectorReady(slots);
  if (!full) return;

  const v0 = full[0].value.toLowerCase();
  const kw = cssGlobalKeywords.has(v0);
  for (const s of full) {
    const sv = s.value.toLowerCase();
    if (kw ? sv !== v0 : cssGlobalKeywords.has(sv)) return;
  }
  if (!supportProvenanceMatches(full)) return;

  const rawValues = full.map((s) => s.value).join(' ');
  const shorthandVal = kw ? full[0].value : minifyTrbl(rawValues);
  commitShorthand(rule, full, contributing, fallbacks, {
    prop,
    value: shorthandVal,
    important: lane,
  });
}

/** @param {Container} rule @param {string} prop @param {string[]} sideProps @param {Declaration[]} laneDecls @param {boolean} lane */
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
    const idx = isShort ? -1 : sideProps.indexOf(p);
    if (!isShort && idx === -1) {
      reset();
      continue;
    }
    if (stylehacks.detect(decl) || (isShort && !canExplode(decl))) {
      reset();
      continue;
    }
    if (shouldResetSlots(slots, idx, decl)) reset();

    const vals = isShort ? parseTrbl(decl.value) : null;
    for (let i = 0; i < 4; i++) {
      if (isShort || i === idx) {
        assignSlotValue(slots, i, vals ? vals[i] : decl.value, decl, fallbacks);
      }
    }
    contributing.add(decl);
  }
  flush(rule, prop, slots, contributing, fallbacks, lane);
}

/** @param {Container} rule @param {string} prop @param {Declaration[]} [declarations] @param {[Declaration[], Declaration[]]} [lanes] */
export function reduceBox(rule, prop, declarations, lanes) {
  if (!rule.nodes) return;
  const sideProps = topRightBottomLeft.map((d) => `${prop}-${d}`);
  const family = new Set([prop, ...sideProps]);
  const decls =
    declarations &&
    declarations.every(
      (d) => d.parent === rule && family.has(d.prop.toLowerCase())
    )
      ? declarations
      : /** @type {Declaration[]} */ (
          rule.nodes.filter(
            (n) => n.type === 'decl' && family.has(n.prop.toLowerCase())
          )
        );

  if (decls.length === 0 || decls.some(isInvalid)) return;

  const familyLanes =
    lanes ??
    importanceLanes(
      rule,
      /** @type {Declaration[]} */ (
        rule.nodes.filter(
          (n) => n.type === 'decl' && n.prop.toLowerCase().startsWith(prop)
        )
      )
    );
  cleanupLaneSegments(familyLanes, (segment) => cleanupDeclarations(segment));

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    const s = live[0];
    const isTarget = s?.prop.toLowerCase() === prop;
    if (isTarget && !stylehacks.detect(s) && canExplode(s)) {
      s.prop = prop;
      s.value = minifyTrbl(s.value);
      delete s.raws?.value;
    }
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = familyLanes[lane ? 1 : 0].filter(
      (d) => d.parent === rule
    );
    if (laneDecls.some((d) => !isAll(d))) {
      processLane(rule, prop, sideProps, laneDecls, lane);
    }
  }
}
