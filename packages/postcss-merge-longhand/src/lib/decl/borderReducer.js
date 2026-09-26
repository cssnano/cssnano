import { list } from 'postcss';
import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import parseTrbl from '../parseTrbl.js';
import parseWidthStyleColor from '../parseWsc.js';
import spec, { setsLonghands } from '../spec.js';
import stylehacks from 'stylehacks';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import isCustomProp from '../isCustomProp.js';
import { isSubstitution } from '../unresolved.js';
import canExplode from '../canExplode.js';
import {
  isFallback,
  mergeBlockingSupport,
  strandsFallback,
} from '../isFallback.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import {
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
} from '../validateWsc.js';
import {
  allPhysicalBorderProperties,
  allRadiusProperties,
  allSidesBorderShorthands,
  borderAndSideShorthands,
  getLevel,
  physicalBorderShorthands,
  widthStyleColor,
} from './borderData.js';
import { isAll } from './importanceLanes.js';
import {
  applyBestCandidate,
  generateCandidates,
  selectBestCandidate,
} from './borderCandidates.js';
/** @import {Container, Declaration} from 'postcss'; */

const sides = spec.sides,
  components = widthStyleColor;

/**
 * @param {string} value
 * @return {boolean}
 */
function hasSubstitution(value) {
  return (
    isCustomProp(/** @type {Declaration} */ ({ value })) ||
    list.space(value).some(isSubstitution)
  );
}
/**
 * @param {Declaration} declaration
 * @return {boolean}
 */
function browserKeeps(declaration) {
  if (cssGlobalKeywords.has(declaration.value.toLowerCase())) {
    return true;
  }
  const prop = declaration.prop.toLowerCase();
  if (borderAndSideShorthands.has(prop)) {
    return specifiesDistinctComponents(declaration.value);
  }
  const component = /** @type {string} */ (prop.split('-').at(-1));
  if (!allSidesBorderShorthands.includes(prop)) {
    return specifiesComponent(declaration.value, component);
  }
  if (list.space(declaration.value).length > spec.sides.length) return false;
  return parseTrbl(declaration.value).every((v) =>
    specifiesComponent(v, component)
  );
}
/**
 * @param {import('postcss').Node} node
 * @param {boolean} [lane]
 * @return {boolean}
 */
function establishesBorderReset(node, lane) {
  if (node.type !== 'decl') return false;
  const d = /** @type {Declaration} */ (node);
  if (
    (lane !== undefined && Boolean(d.important) !== lane) ||
    d.prop.toLowerCase() !== 'border' ||
    !canExplode(d) ||
    stylehacks.detect(d)
  )
    return false;
  const triple = parseWidthStyleColor(d.value);
  return triple !== null && isValidWidthStyleColor(triple);
}
/** @param {Container} rule */
function hasForeignBorderNodes(rule) {
  if (!rule.nodes) return false;
  for (const node of rule.nodes) {
    if (node.type !== 'decl') continue;
    if (isAll(/** @type {Declaration} */ (node))) return true;
    const p = node.prop.toLowerCase();
    if (allRadiusProperties.has(p) || p === 'border-spacing') continue;
    if (p.startsWith('border-') && !allPhysicalBorderProperties.has(p)) {
      return true;
    }
  }
  return false;
}
/** @param {Declaration} d */
function normalizeBorderSingleton(d) {
  if (stylehacks.detect(d) || !browserKeeps(d) || !canExplode(d)) return;
  const p = d.prop.toLowerCase();
  if (p === 'border' || physicalBorderShorthands.includes(p)) {
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
  const isBarrier =
    hasSubstitution(d.value) ||
    cssGlobalKeywords.has(d.value.toLowerCase()) ||
    !canExplode(d);

  if (prop === 'border' || physicalBorderShorthands.includes(prop)) {
    const isB = prop === 'border';
    const sList = isB ? [0, 1, 2, 3] : [sides.indexOf(prop.slice(7))];
    const parsed = parseWidthStyleColor(d.value);
    // browserKeeps gated this declaration; a null here would mean an ignored
    // value flowing into cell state, so never name components from it.
    if (!parsed) return;
    const { width: w, style: st, color: clr } = parsed;
    const triple = [w || 'medium', st || 'none', clr || 'currentcolor'];
    for (const s of sList) {
      for (let c = 0; c < 3; c++) {
        updateCell(s * 3 + c, d, triple[c], isBarrier, state);
      }
    }
    if (isB && !isBarrier && establishesBorderReset(d, Boolean(d.important)))
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
    if (browserKeeps(d)) applySegmentDeclaration(d, state);
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
    if (browserKeeps(d) && canExplode(d) && !stylehacks.detect(d)) {
      const p = d.prop.toLowerCase();
      if (allSidesBorderShorthands.includes(p)) {
        d.value = minifyTrbl(d.value);
      }
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
 * @param {Container} rule
 * @param {Declaration[]} [declarations]
 * @param {boolean} [hasForeignBorder]
 * @return {void}
 */
export function reduceBorder(rule, declarations, hasForeignBorder) {
  if (!rule.nodes) return;
  if (hasForeignBorder === true) return;
  if (hasForeignBorder === undefined && hasForeignBorderNodes(rule)) return;

  const decls =
    declarations ??
    /** @type {Declaration[]} */ (
      rule.nodes.filter(
        (n) =>
          n.type === 'decl' &&
          allPhysicalBorderProperties.has(n.prop.toLowerCase())
      )
    );

  if (
    decls.length === 0 ||
    decls.some((d) => {
      const p = d.prop.toLowerCase();
      const isCustomShorthand =
        (borderAndSideShorthands.has(p) ||
          allSidesBorderShorthands.includes(p)) &&
        hasSubstitution(d.value);
      return (
        cssGlobalKeywords.has(d.value.toLowerCase()) ||
        isCustomShorthand ||
        (!stylehacks.detect(d) && !browserKeeps(d))
      );
    })
  )
    return;

  cleanupDeclarations(
    new Set(decls),
    (node, lastNode) => {
      if (!browserKeeps(lastNode)) return false;
      const lastPart = lastNode.prop.split('-').pop();

      return (
        !hasSubstitution(lastNode.value) &&
        !strandsFallback(node, lastNode) &&
        /** @type {number} */ (getLevel(node.prop)) >
          /** @type {number} */ (getLevel(lastNode.prop)) &&
        (node.prop.toLowerCase().includes(lastNode.prop.toLowerCase()) ||
          node.prop.toLowerCase().endsWith(/** @type {string} */ (lastPart)))
      );
    },
    (node) => setsLonghands(node.prop.toLowerCase())
  );

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
