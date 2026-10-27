import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { discardOverriddenInList } from './overriddenDeclarations.js';
import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import { expandFourSides } from '../parseTrbl.js';
import parseWidthStyleColor from '../parseWsc.js';
import { declarationTokens, splitComponents } from '../componentRanges.js';
import { setsLonghands } from '../spec.js';
import { detectDeclaration } from '#stylehacks';
import hasSubstitution from '../hasSubstitution.js';
import canExplode from '../canExplode.js';
import {
  isFallback,
  mergeBlockingSupport,
  strandsFallback,
} from '../isFallback.js';
import {
  isValidWidthStyleColor,
  namesComponent,
  specifiesComponent,
} from '../validateWsc.js';
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

const { asciiLowerCase } = cssnanoUtils;
/** @import {Container, Declaration} from 'postcss'; */
/** @import {TextTable} from '../../../../../values/textTable.js'; */
/** @import {ValueComponent} from '../componentRanges.js' */

/**
 * @param {Declaration} declaration
 * @param {TextTable} textTable the tokens the walk left for the declaration
 * @return {boolean}
 */
function borderBrowserKeeps(declaration, textTable) {
  if (isCssWideKeyword(declaration.value)) {
    return true;
  }
  const prop = asciiLowerCase(declaration.prop);
  const tokens = declarationTokens(textTable, declaration);
  if (borderAndSideShorthands.has(prop)) {
    return parseWidthStyleColor(declaration.value, tokens) !== null;
  }
  const component = /** @type {string} */ (prop.split('-').at(-1));
  if (!allSidesBorderShorthands.includes(prop)) {
    return specifiesComponent(declaration.value, tokens, component);
  }
  const parts = splitComponents(declaration.value, tokens);
  if (parts.length > sides.length) return false;
  return expandFourSides(parts).every((part) =>
    namesComponent(part, component)
  );
}

/**
 * @param {Declaration} d
 * @param {TextTable} textTable
 */
function normalizeBorderSingleton(d, textTable) {
  if (detectDeclaration(d) || !canExplode(d, textTable)) return;
  const p = asciiLowerCase(d.prop);
  if (borderAndSideShorthands.has(p)) {
    d.prop = p;
    textTable.setText(
      d,
      minifyWidthStyleColor(d.value, declarationTokens(textTable, d))
    );
  } else if (allSidesBorderShorthands.includes(p)) {
    d.prop = p;
    textTable.setText(d, minifyTrbl(d.value));
  }
}
/**
 * @param {Declaration} prev
 * @param {Declaration} d
 * @param {TextTable} textTable
 * @return {boolean}
 */
function isDeclarationFallback(prev, d, textTable) {
  if (asciiLowerCase(prev.prop) === asciiLowerCase(d.prop)) {
    return isFallback(prev, d, textTable);
  }
  return (
    mergeBlockingSupport(d, textTable).size > 0 &&
    isFallback(prev, d, textTable)
  );
}
/**
 * @param {number} idx
 * @param {Declaration} d
 * @param {string} value
 * @param {ValueComponent | undefined} part the component `value` is, when the
 * declaration's value split into components
 * @param {boolean} isBarrier
 * @param {{ cells: string[], cellComponents: (ValueComponent | undefined)[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }} state
 * @param {TextTable} textTable
 */
function updateCell(idx, d, value, part, isBarrier, state, textTable) {
  for (const prev of state.cellHistory[idx]) {
    if (isDeclarationFallback(prev, d, textTable)) state.fallbacks.add(prev);
  }
  if (isBarrier) {
    state.barrierCells.add(idx);
  } else {
    state.barrierCells.delete(idx);
    state.cells[idx] = value;
    state.cellComponents[idx] = part;
  }
  state.cellHistory[idx].add(d);
  state.touched.add(idx);
}
/**
 * @param {Declaration} d
 * @param {{ cells: string[], cellComponents: (ValueComponent | undefined)[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }} state
 * @param {TextTable} textTable
 */
function applySegmentDeclaration(d, state, textTable) {
  const prop = asciiLowerCase(d.prop);
  const tokens = declarationTokens(textTable, d);
  // Segment members passed the family guard: no global keyword, explodable.
  const isBarrier = hasSubstitution(d.value, tokens);

  if (borderAndSideShorthands.has(prop)) {
    const isB = prop === 'border';
    const sList = isB ? [0, 1, 2, 3] : [sides.indexOf(prop.slice(7))];
    const parsed = parseWidthStyleColor(d.value, tokens);
    // borderBrowserKeeps gated this declaration; a null here would mean an ignored
    // value flowing into cell state, so never name components from it.
    if (!parsed) return;
    const { width: w, style: st, color: clr, parts } = parsed;
    const triple = [w || 'medium', st || 'none', clr || 'currentcolor'];
    const componentParts = [parts.width, parts.style, parts.color];
    for (const s of sList) {
      for (let c = 0; c < 3; c++) {
        updateCell(
          s * 3 + c,
          d,
          triple[c],
          componentParts[c],
          isBarrier,
          state,
          textTable
        );
      }
    }
    if (isB && !isBarrier && isValidWidthStyleColor(parsed))
      state.resetFound = true;
  } else if (allSidesBorderShorthands.includes(prop)) {
    const c = components.indexOf(prop.slice(7));
    const parts = expandFourSides(splitComponents(d.value, tokens));
    for (let s = 0; s < 4; s++) {
      updateCell(
        s * 3 + c,
        d,
        parts[s]?.raw,
        parts[s],
        isBarrier,
        state,
        textTable
      );
    }
  } else {
    const [sName, cName] = prop.slice(7).split('-');
    const s = sides.indexOf(sName);
    const c = components.indexOf(cName);
    if (s !== -1 && c !== -1) {
      const parts = splitComponents(d.value, tokens);
      updateCell(
        s * 3 + c,
        d,
        d.value,
        parts.length === 1 ? parts[0] : undefined,
        isBarrier,
        state,
        textTable
      );
    }
  }
}
/**
 * @param {Declaration[]} segment
 * @param {TextTable} textTable
 * @return {{ cells: string[], cellComponents: (ValueComponent | undefined)[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }}
 */
function analyzeSegment(segment, textTable) {
  /** @type {{ cells: string[], cellComponents: (ValueComponent | undefined)[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, fallbacks: Set<Declaration>, resetFound: boolean }} */
  const state = {
    cells: Array.from({ length: 12 }, () => ''),
    cellComponents: Array.from({ length: 12 }),
    cellHistory: Array.from({ length: 12 }, () => new Set()),
    touched: new Set(),
    barrierCells: new Set(),
    fallbacks: new Set(),
    resetFound: false,
  };
  for (const d of segment) {
    applySegmentDeclaration(d, state, textTable);
  }
  return state;
}

/**
 * @param {Container} rule
 * @param {Declaration[]} segment
 * @param {boolean} lane
 * @param {TextTable} textTable
 */
function reduceSegment(rule, segment, lane, textTable) {
  if (segment.length === 0) return;
  if (segment.length === 1) {
    const d = segment[0];
    if (allSidesBorderShorthands.includes(asciiLowerCase(d.prop))) {
      textTable.setText(d, minifyTrbl(d.value));
    }
    return;
  }

  const state = analyzeSegment(segment, textTable);
  if (state.touched.size === 0) return;

  const hasReset = state.resetFound;
  const candidates = generateCandidates(
    state.cells,
    state.cellComponents,
    state.cellHistory,
    state.touched,
    state.barrierCells,
    hasReset,
    lane,
    state.fallbacks,
    textTable
  );

  const best = selectBestCandidate(
    candidates,
    state.cellHistory,
    state.fallbacks,
    state.touched,
    lane,
    segment
  );
  if (!best) return;

  applyBestCandidate(rule, best, segment, lane, textTable);
}

/**
 * @param {Container} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} lane
 * @param {TextTable} textTable
 */
function processLane(rule, laneDecls, lane, textTable) {
  /** @type {Declaration[]} */
  let segment = [];

  for (const d of laneDecls) {
    if (detectDeclaration(d) || !canExplode(d, textTable)) {
      if (segment.length) {
        reduceSegment(rule, segment, lane, textTable);
        segment = [];
      }
      continue;
    }
    segment.push(d);
  }

  if (segment.length) {
    reduceSegment(rule, segment, lane, textTable);
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
 * @param {TextTable} textTable
 * @return {boolean}
 */
function isOverriddenByShorthand(node, lastNode, textTable) {
  return (
    /** @type {number} */ (getLevel(node.prop)) >
      /** @type {number} */ (getLevel(lastNode.prop)) &&
    !strandsFallback(node, lastNode, textTable)
  );
}

/** @type {import('./overriddenDeclarations.js').CrossPropertyRule} */
const borderPrecedence = {
  overrides: isOverriddenByShorthand,
  footprint: (node) => setsLonghands(asciiLowerCase(node.prop)),
};

/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {boolean} hasForeignBorder
 * @param {TextTable} textTable the tokens the walk left for the declarations
 * @return {void}
 */
export function reduceBorder(rule, decls, hasForeignBorder, textTable) {
  if (!rule.nodes || hasForeignBorder) return;

  if (
    decls.length === 0 ||
    decls.some((d) => {
      const p = asciiLowerCase(d.prop);
      const isCustomShorthand =
        allBorderShorthands.has(p) &&
        hasSubstitution(d.value, declarationTokens(textTable, d));
      return (
        isCssWideKeyword(d.value) ||
        isCustomShorthand ||
        (!detectDeclaration(d) && !borderBrowserKeeps(d, textTable))
      );
    })
  )
    return;

  discardOverriddenInList(
    decls,
    textTable,
    allPhysicalBorderProperties,
    borderPrecedence
  );

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    if (live[0]) normalizeBorderSingleton(live[0], textTable);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = live.filter(
      (d) => Boolean(d.important) === lane && d.parent
    );
    if (laneDecls.length) {
      processLane(rule, laneDecls, lane, textTable);
    }
  }
}
