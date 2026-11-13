import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { discardOverriddenInList } from './overriddenDeclarations.js';
import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import { expandFourSides } from '../parseTrbl.js';
import parseWidthStyleColor from '../parseWsc.js';
import { declarationTokens, splitComponents } from '../componentRanges.js';
import { setsLonghands } from '../../../../ir/spec.js';
import { hasHack } from '#stylehacks';
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
/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js'; */
/** @import {ValueComponent} from '../componentRanges.js' */

/**
 * @param {DeclarationItem} declaration
 * @return {boolean}
 */
function borderBrowserKeeps(declaration) {
  if (isCssWideKeyword(declaration.value)) {
    return true;
  }
  const prop = asciiLowerCase(declaration.prop);
  const tokens = declarationTokens(declaration);
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
 * @param {BlockDeclarations} list
 * @param {number} position
 */
function normalizeBorderSingleton(list, position) {
  const d = list.at(position);
  if (hasHack(d.before, d.prop, d.value) || !canExplode(d)) return;
  const p = asciiLowerCase(d.prop);
  if (borderAndSideShorthands.has(p)) {
    list.rewrite(
      position,
      p,
      minifyWidthStyleColor(d.value, declarationTokens(d))
    );
  } else if (allSidesBorderShorthands.includes(p)) {
    list.rewrite(position, p, minifyTrbl(d.value));
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {number} prev
 * @param {number} d
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
function isDeclarationFallback(list, prev, d, features) {
  const earlier = list.at(prev);
  const later = list.at(d);
  if (asciiLowerCase(earlier.prop) === asciiLowerCase(later.prop)) {
    return isFallback(earlier, later, features);
  }
  return (
    mergeBlockingSupport(later, features).size > 0 &&
    isFallback(earlier, later, features)
  );
}

/**
 * @typedef {object} SegmentState
 * @property {string[]} cells
 * @property {(ValueComponent | undefined)[]} cellComponents
 * @property {Set<number>[]} cellHistory
 * @property {Set<number>} touched
 * @property {Set<number>} barrierCells
 * @property {Set<number>} fallbacks
 * @property {boolean} resetFound
 */

/**
 * @param {BlockDeclarations} list
 * @param {number} idx
 * @param {number} d - the declaration's position
 * @param {string} value
 * @param {ValueComponent | undefined} part the component `value` is, when the
 * declaration's value split into components
 * @param {boolean} isBarrier
 * @param {SegmentState} state
 * @param {ReadonlySet<string>} features the features every target supports
 */
function updateCell(list, idx, d, value, part, isBarrier, state, features) {
  for (const prev of state.cellHistory[idx]) {
    if (isDeclarationFallback(list, prev, d, features))
      state.fallbacks.add(prev);
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
 * @param {BlockDeclarations} list
 * @param {number} position
 * @param {SegmentState} state
 * @param {ReadonlySet<string>} features the features every target supports
 */
function applySegmentDeclaration(list, position, state, features) {
  const d = list.at(position);
  const prop = asciiLowerCase(d.prop);
  const tokens = declarationTokens(d);
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
          list,
          s * 3 + c,
          position,
          triple[c],
          componentParts[c],
          isBarrier,
          state,
          features
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
        list,
        s * 3 + c,
        position,
        parts[s]?.raw,
        parts[s],
        isBarrier,
        state,
        features
      );
    }
  } else {
    const [sName, cName] = prop.slice(7).split('-');
    const s = sides.indexOf(sName);
    const c = components.indexOf(cName);
    if (s !== -1 && c !== -1) {
      const parts = splitComponents(d.value, tokens);
      updateCell(
        list,
        s * 3 + c,
        position,
        d.value,
        parts.length === 1 ? parts[0] : undefined,
        isBarrier,
        state,
        features
      );
    }
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {number[]} segment
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {SegmentState}
 */
function analyzeSegment(list, segment, features) {
  /** @type {SegmentState} */
  const state = {
    cells: Array.from({ length: 12 }, () => ''),
    cellComponents: Array.from({ length: 12 }),
    cellHistory: Array.from({ length: 12 }, () => new Set()),
    touched: new Set(),
    barrierCells: new Set(),
    fallbacks: new Set(),
    resetFound: false,
  };
  for (const position of segment) {
    applySegmentDeclaration(list, position, state, features);
  }
  return state;
}

/**
 * @param {BlockDeclarations} list
 * @param {number[]} segment
 * @param {boolean} lane
 * @param {ReadonlySet<string>} features the features every target supports
 */
function reduceSegment(list, segment, lane, features) {
  if (segment.length === 0) return;
  if (segment.length === 1) {
    const position = segment[0];
    const d = list.at(position);
    if (allSidesBorderShorthands.includes(asciiLowerCase(d.prop))) {
      list.rewrite(position, d.prop, minifyTrbl(d.value));
    }
    return;
  }

  const state = analyzeSegment(list, segment, features);
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
    list,
    features
  );

  const best = selectBestCandidate(
    list,
    candidates,
    state.cellHistory,
    state.fallbacks,
    state.touched,
    lane,
    segment
  );
  if (!best) return;

  applyBestCandidate(list, best, segment, lane);
}

/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} laneDecls
 * @param {boolean} lane
 * @param {ReadonlySet<string>} features the features every target supports
 */
function processLane(list, laneDecls, lane, features) {
  /** @type {number[]} */
  let segment = [];

  for (const position of laneDecls) {
    const d = list.at(position);
    if (hasHack(d.before, d.prop, d.value) || !canExplode(d)) {
      if (segment.length) {
        reduceSegment(list, segment, lane, features);
        segment = [];
      }
      continue;
    }
    segment.push(position);
  }

  if (segment.length) {
    reduceSegment(list, segment, lane, features);
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
 * @param {DeclarationItem} node
 * @param {DeclarationItem} lastNode
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
function isOverriddenByShorthand(node, lastNode, features) {
  return (
    /** @type {number} */ (getLevel(node.prop)) >
      /** @type {number} */ (getLevel(lastNode.prop)) &&
    !strandsFallback(node, lastNode, features)
  );
}

/** @type {import('./overriddenDeclarations.js').CrossPropertyRule} */
const borderPrecedence = {
  overrides: isOverriddenByShorthand,
  footprint: (node) => setsLonghands(asciiLowerCase(node.prop)),
};

/**
 * @param {BlockDeclarations} list
 * @param {number[]} decls - positions in `list`
 * @param {boolean} hasForeignBorder
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export function reduceBorder(list, decls, hasForeignBorder, features) {
  if (hasForeignBorder) return;

  if (
    decls.length === 0 ||
    decls.some((position) => {
      const d = list.at(position);
      const p = asciiLowerCase(d.prop);
      const isCustomShorthand =
        allBorderShorthands.has(p) &&
        hasSubstitution(d.value, declarationTokens(d));
      return (
        isCssWideKeyword(d.value) ||
        isCustomShorthand ||
        (!hasHack(d.before, d.prop, d.value) && !borderBrowserKeeps(d))
      );
    })
  )
    return;

  discardOverriddenInList(
    list,
    decls,
    features,
    allPhysicalBorderProperties,
    borderPrecedence
  );

  const live = decls.filter((p) => !list.at(p).removed);
  if (live.length <= 1) {
    if (live[0] !== undefined) normalizeBorderSingleton(list, live[0]);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = live.filter(
      (p) => Boolean(list.at(p).important) === lane && !list.at(p).removed
    );
    if (laneDecls.length) {
      processLane(list, laneDecls, lane, features);
    }
  }
}
