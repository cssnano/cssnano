import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { discardOverriddenInList } from './overriddenDeclarations.js';
import { list } from 'postcss';
import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import parseTrbl from '../parseTrbl.js';
import parseWidthStyleColor from '../parseWsc.js';
import { setsLonghands } from '../spec.js';
import stylehacks from 'stylehacks';
import hasSubstitution from '../hasSubstitution.js';
import canExplode from '../canExplode.js';
import {
  isFallback,
  mergeBlockingSupport,
  strandsFallback,
} from '../isFallback.js';
import { isValidWidthStyleColor, specifiesComponent } from '../validateWsc.js';
import {
  allPhysicalBorderProperties,
  allSidesBorderShorthands,
  borderAndSideShorthands,
  getLevel,
  allBorderShorthands,
  sides,
  widthStyleColor as components,
} from './borderData.js';
import {
  applyBestCandidate,
  generateCandidates,
  selectBestCandidate,
} from './borderCandidates.js';
/** @import {Container, Declaration} from 'postcss'; */

/**
 * @param {Declaration} declaration
 * @return {boolean}
 */
function borderBrowserKeeps(declaration) {
  if (isCssWideKeyword(declaration.value)) {
    return true;
  }
  const prop = declaration.prop.toLowerCase();
  if (borderAndSideShorthands.has(prop)) {
    return parseWidthStyleColor(declaration.value) !== null;
  }
  const component = /** @type {string} */ (prop.split('-').at(-1));
  if (!allSidesBorderShorthands.includes(prop)) {
    return specifiesComponent(declaration.value, component);
  }
  if (list.space(declaration.value).length > sides.length) return false;
  return parseTrbl(declaration.value).every((v) =>
    specifiesComponent(v, component)
  );
}

/** @param {Declaration} d */
function normalizeBorderSingleton(d) {
  if (stylehacks.detect(d) || !canExplode(d)) return;
  const p = d.prop.toLowerCase();
  if (borderAndSideShorthands.has(p)) {
    d.prop = p;
    d.value = minifyWidthStyleColor(d.value);
    delete d.raws?.value;
  } else if (allSidesBorderShorthands.includes(p)) {
    d.prop = p;
    d.value = minifyTrbl(d.value);
    delete d.raws?.value;
  }
}
/**
 * @param {Declaration} prev
 * @param {Declaration} d
 * @return {boolean}
 */
function isDeclarationFallback(prev, d) {
  if (prev.prop.toLowerCase() === d.prop.toLowerCase()) {
    return isFallback(prev, d);
  }
  return mergeBlockingSupport(d).size > 0 && isFallback(prev, d);
}
/**
 * @param {number} idx
 * @param {Declaration} d
 * @param {string} value
 * @param {boolean} isBarrier
 * @param {{ cells: string[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }} state
 */
function updateCell(idx, d, value, isBarrier, state) {
  for (const prev of state.cellHistory[idx]) {
    if (isDeclarationFallback(prev, d)) state.fallbacks.add(prev);
  }
  if (isBarrier) {
    state.barrierCells.add(idx);
  } else {
    state.barrierCells.delete(idx);
    state.cells[idx] = value;
  }
  state.cellHistory[idx].add(d);
  state.touched.add(idx);
}
/**
 * @param {Declaration} d
 * @param {{ cells: string[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }} state
 */
function applySegmentDeclaration(d, state) {
  const prop = d.prop.toLowerCase();
  // Segment members passed the family guard: no global keyword, explodable.
  const isBarrier = hasSubstitution(d.value);

  if (borderAndSideShorthands.has(prop)) {
    const isB = prop === 'border';
    const sList = isB ? [0, 1, 2, 3] : [sides.indexOf(prop.slice(7))];
    const parsed = parseWidthStyleColor(d.value);
    // borderBrowserKeeps gated this declaration; a null here would mean an ignored
    // value flowing into cell state, so never name components from it.
    if (!parsed) return;
    const { width: w, style: st, color: clr } = parsed;
    const triple = [w || 'medium', st || 'none', clr || 'currentcolor'];
    for (const s of sList) {
      for (let c = 0; c < 3; c++) {
        updateCell(s * 3 + c, d, triple[c], isBarrier, state);
      }
    }
    if (isB && !isBarrier && isValidWidthStyleColor(parsed))
      state.resetFound = true;
  } else if (allSidesBorderShorthands.includes(prop)) {
    const c = components.indexOf(prop.slice(7));
    const vals = parseTrbl(d.value);
    for (let s = 0; s < 4; s++) {
      updateCell(s * 3 + c, d, vals[s], isBarrier, state);
    }
  } else {
    const [sName, cName] = prop.slice(7).split('-');
    const s = sides.indexOf(sName);
    const c = components.indexOf(cName);
    if (s !== -1 && c !== -1) {
      updateCell(s * 3 + c, d, d.value, isBarrier, state);
    }
  }
}
/**
 * @param {Declaration[]} segment
 * @return {{ cells: string[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }}
 */
function analyzeSegment(segment) {
  /** @type {{ cells: string[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }} */
  const state = {
    cells: Array.from({ length: 12 }, () => ''),
    cellHistory: Array.from({ length: 12 }, () => new Set()),
    touched: new Set(),
    barrierCells: new Set(),
    fallbacks: new Set(),
    resetFound: false,
  };
  for (const d of segment) {
    applySegmentDeclaration(d, state);
  }
  return state;
}

/**
 * @param {Container} rule
 * @param {Declaration[]} segment
 * @param {boolean} lane
 */
function reduceSegment(rule, segment, lane) {
  if (segment.length === 0) return;
  if (segment.length === 1) {
    const d = segment[0];
    if (allSidesBorderShorthands.includes(d.prop.toLowerCase())) {
      d.value = minifyTrbl(d.value);
    }
    return;
  }

  const state = analyzeSegment(segment);
  if (state.touched.size === 0) return;

  const hasReset = state.resetFound;
  const candidates = generateCandidates(
    state.cells,
    state.cellHistory,
    state.touched,
    state.barrierCells,
    hasReset,
    lane,
    state.fallbacks
  );
  if (candidates.length === 0) return;

  const best = selectBestCandidate(
    candidates,
    state.cellHistory,
    state.fallbacks,
    state.touched,
    lane,
    segment
  );
  if (!best) return;

  applyBestCandidate(rule, best, segment, lane);
}

/**
 * @param {Container} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} lane
 */
function processLane(rule, laneDecls, lane) {
  /** @type {Declaration[]} */
  let segment = [];

  for (const d of laneDecls) {
    if (stylehacks.detect(d) || !canExplode(d)) {
      if (segment.length) {
        reduceSegment(rule, segment, lane);
        segment = [];
      }
      continue;
    }
    segment.push(d);
  }

  if (segment.length) {
    reduceSegment(rule, segment, lane);
  }
}

/**
 * A later border shorthand of a higher level resets the earlier declaration's
 * longhands, unless it requires support the earlier does not. The caller only
 * compares declarations whose longhands overlap, and a broader shorthand
 * covers every longhand of a narrower one it overlaps. `reduceBorder` already
 * rejected substitutions and ignored values in the family, and style hacks
 * never win, so the later declaration is a valid, substitution-free shorthand.
 *
 * @param {Declaration} node
 * @param {Declaration} lastNode
 * @return {boolean}
 */
function isOverriddenByShorthand(node, lastNode) {
  return (
    /** @type {number} */ (getLevel(node.prop)) >
      /** @type {number} */ (getLevel(lastNode.prop)) &&
    !strandsFallback(node, lastNode)
  );
}

/** @type {import('./overriddenDeclarations.js').CrossPropertyRule} */
const borderPrecedence = {
  overrides: isOverriddenByShorthand,
  footprint: (node) => setsLonghands(node.prop.toLowerCase()),
};

/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {boolean} hasForeignBorder
 * @return {void}
 */
export function reduceBorder(rule, decls, hasForeignBorder) {
  if (!rule.nodes || hasForeignBorder) return;

  if (
    decls.length === 0 ||
    decls.some((d) => {
      const p = d.prop.toLowerCase();
      const isCustomShorthand =
        allBorderShorthands.has(p) && hasSubstitution(d.value);
      return (
        isCssWideKeyword(d.value) ||
        isCustomShorthand ||
        (!stylehacks.detect(d) && !borderBrowserKeeps(d))
      );
    })
  )
    return;

  discardOverriddenInList(decls, allPhysicalBorderProperties, borderPrecedence);

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    if (live[0]) normalizeBorderSingleton(live[0]);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = live.filter(
      (d) => Boolean(d.important) === lane && d.parent
    );
    if (laneDecls.length) {
      processLane(rule, laneDecls, lane);
    }
  }
}
