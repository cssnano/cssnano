import cssnanoUtils from '#utils';
/** @import {BlockDeclarations} from '../blockDeclarations.js' */
/** @import {ValueComponent} from '../componentRanges.js' */
import { setsLonghands } from '../spec.js';
import {
  allBorderShorthands,
  borderPropertyToCellIndex,
  cellProperties,
  componentCells,
  sideCells,
} from './borderData.js';
import {
  COMPONENT_SHORTHAND_CANDIDATE,
  RESET_CANDIDATE,
  SIDE_SHORTHAND_CANDIDATE,
  createGroupCandidate,
  createLeafCandidate,
  createResetCandidates,
  declSize,
  declarationsOfCells,
  getAvailableComponents,
  getAvailableSides,
} from './borderCandidateBuilders.js';
import { declCost } from './slotVector.js';

const { asciiLowerCase } = cssnanoUtils;

/**
 * The byte cost of the declarations at the positions, as `declSize` gives it.
 *
 * @param {BlockDeclarations} list
 * @param {Iterable<number>} positions
 * @param {boolean} [important]
 * @return {number}
 */
export function positionsSize(list, positions, important) {
  let sum = 0;
  for (const position of positions) {
    const d = list.at(position);
    sum += declCost(d.prop, d.value, important);
  }
  return sum;
}

/* Selection and application for the border reducer: given the candidates the
 * builders produce and the segment analysis state (final cell values, cell
 * history, barriers, fallbacks), score the non-overlapping covers and rewrite
 * the rule. Candidate construction lives in borderCandidateBuilders.js. */

/**
 * @template T
 * @param {T[]} items
 * @return {T[][]}
 */
function getSubsets(items) {
  const result = [];
  const n = items.length;
  const limit = Math.pow(2, n);
  for (let mask = 1; mask < limit; mask++) {
    const sub = [];
    for (let i = 0; i < n; i++) {
      if (Math.floor(mask / Math.pow(2, i)) % 2 === 1) sub.push(items[i]);
    }
    result.push(sub);
  }
  return result;
}

/**
 * @param {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex?: number }} a
 * @param {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex?: number }} b
 * @param {boolean} lane
 * @return {number}
 */
function compareCandidates(a, b, lane) {
  const sizeA = declSize(a.decls, lane);
  const sizeB = declSize(b.decls, lane);
  if (sizeA !== sizeB) return sizeA - sizeB;
  if (a.rank !== b.rank) return a.rank - b.rank;
  /* Masks are distinct within a shorthand family, so the winner does not
   * depend on the order the candidates were generated in. */
  if (
    a.rank === COMPONENT_SHORTHAND_CANDIDATE ||
    a.rank === SIDE_SHORTHAND_CANDIDATE
  ) {
    return b.mask - a.mask;
  }
  if (a.rank === RESET_CANDIDATE) {
    return (a.resetIndex ?? 0) - (b.resetIndex ?? 0);
  }
  return 0;
}
/**
 * @param {string[]} cells
 * @param {(ValueComponent | undefined)[]} cellComponents
 * @param {Set<number>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {boolean} hasReset
 * @param {boolean} lane
 * @param {Set<number>} fallbacks
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 */
export function generateCandidates(
  cells,
  cellComponents,
  cellHistory,
  touched,
  barrierCells,
  hasReset,
  lane,
  fallbacks,
  list,
  features
) {
  const availSides = getAvailableSides(
    cellHistory,
    touched,
    barrierCells,
    fallbacks,
    list,
    features
  );
  const availComps = getAvailableComponents(
    cellHistory,
    touched,
    barrierCells,
    list,
    features
  );

  const protectedCells = new Set(
    [...touched].filter((idx) =>
      [...cellHistory[idx]].some((d) => fallbacks.has(d))
    )
  );
  const existingLeafCells = new Set(
    [...touched].filter((idx) => {
      return [...cellHistory[idx]].some(
        (d) =>
          asciiLowerCase(list.at(d).prop) === cellProperties[idx] &&
          asciiLowerCase(list.at(d).value) === asciiLowerCase(cells[idx])
      );
    })
  );
  const blockedCells = new Set([
    ...barrierCells,
    ...protectedCells,
    ...existingLeafCells,
  ]);

  const resetCands = createResetCandidates(
    hasReset,
    touched,
    barrierCells,
    cellHistory,
    cells,
    cellComponents,
    lane,
    fallbacks,
    list,
    features
  );

  const compCands = getSubsets(availComps).map((sub) =>
    createGroupCandidate(
      sub.map((c) => componentCells[c]),
      cells,
      cellComponents,
      touched,
      blockedCells,
      true
    )
  );

  const sideCands = getSubsets(availSides).map((sub) =>
    createGroupCandidate(
      sub.map((s) => sideCells[s]),
      cells,
      cellComponents,
      touched,
      blockedCells,
      false
    )
  );

  const leafCand = createLeafCandidate(cells, touched, blockedCells);

  /* Every builder emits declarations only for touched cells, and a reset
   * candidate, whose `border` also resets border-image, only when the segment
   * already has a reset. */
  return [...resetCands, ...compCands, ...sideCands, leafCand];
}
/**
 * @param {BlockDeclarations} list
 * @param {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex?: number, coveredCells: Set<number> }[]} candidates
 * @param {Set<number>[]} cellHistory
 * @param {Set<number>} fallbacks
 * @param {Set<number>} touched
 * @param {boolean} lane
 * @param {number[]} segment
 * @return {{ cand: (typeof candidates)[0], repList: number[], removable: number[], diff: number, size: number, fallbacks: Set<number> } | null}
 */
export function selectBestCandidate(
  list,
  candidates,
  cellHistory,
  fallbacks,
  touched,
  lane,
  segment
) {
  const allTouchedDecls = declarationsOfCells(cellHistory, touched);
  const allRemovable = [...allTouchedDecls].filter((d) => !fallbacks.has(d));
  const originalSize = positionsSize(list, allRemovable, lane);

  /** @type {{ cand: (typeof candidates)[0], repList: number[], removable: number[], diff: number, size: number, fallbacks: Set<number> } | null} */
  let best = null;

  for (const cand of candidates) {
    if (cand.coveredCells.size === 0) continue;
    const candSize = declSize(cand.decls, lane);
    if (candSize > originalSize) continue;

    const rep = declarationsOfCells(cellHistory, cand.coveredCells);
    if (rep.size === 0) continue;
    const repList = segment.filter((d) => rep.has(d));
    const removable = repList.filter((d) => !fallbacks.has(d));
    const removableSet = new Set(removable);

    /* A declaration can contribute one cell to a candidate while still
     * controlling other cells. Removing it in that situation would silently
     * drop those values. Synthetic leaves normally complete the footprint;
     * barriers and preserved fallbacks deliberately prevent that completion. */
    const removesOutsideFootprint = removable.some((d) =>
      [...setsLonghands(asciiLowerCase(list.at(d).prop))].some((p) => {
        const cellIndex = borderPropertyToCellIndex.get(p);
        return cellIndex !== undefined && !cand.coveredCells.has(cellIndex);
      })
    );
    if (removesOutsideFootprint) continue;

    const remaining = allRemovable.filter((d) => !removableSet.has(d));
    const size = candSize + positionsSize(list, remaining, lane);
    if (size > originalSize) continue;
    const diff = size - originalSize;

    const record = { cand, repList, removable, diff, size, fallbacks };
    if (!best) {
      best = record;
    } else {
      const sizeDiff = size - best.size;
      const cmp = sizeDiff || compareCandidates(cand, best.cand, lane);
      if (cmp < 0) {
        best = record;
      }
    }
  }
  return best;
}

/**
 * @param {BlockDeclarations} list
 * @param {{ cand: { decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }, repList: number[], removable: number[], diff: number, size: number, fallbacks: Set<number> }} best
 * @param {number[]} segment
 * @param {boolean} lane
 */
export function applyBestCandidate(list, best, segment, lane) {
  const {
    cand: bestCand,
    repList,
    removable,
    diff: bestDiff,
    fallbacks,
  } = best;

  if (bestDiff === 0) {
    const shouldReplace =
      bestCand.decls.length < removable.length ||
      bestCand.rank === RESET_CANDIDATE ||
      (bestCand.rank === COMPONENT_SHORTHAND_CANDIDATE && bestCand.mask === 7);
    if (!shouldReplace) return;

    const isIdentical =
      bestCand.decls.length === repList.length &&
      bestCand.decls.every((d, i) => {
        const represented = list.at(repList[i]);
        return d.prop === represented.prop && d.value === represented.value;
      });
    if (isIdentical) return;
  }

  const representedDecls = new Set(repList);

  const anchor = repList.at(-1);
  if (anchor === undefined) return;

  /** @type {{prop: string, value: string}[]} */
  const toInsert = [];
  for (const candDecl of bestCand.decls) {
    const p = asciiLowerCase(candDecl.prop);
    if (allBorderShorthands.has(p)) {
      toInsert.push(candDecl);
    } else {
      const alreadyPresent = segment.find(
        (d) =>
          !representedDecls.has(d) &&
          asciiLowerCase(list.at(d).prop) === p &&
          asciiLowerCase(list.at(d).value) === asciiLowerCase(candDecl.value)
      );
      if (alreadyPresent === undefined) {
        toInsert.push(candDecl);
      }
    }
  }

  let prev = anchor;
  for (const { prop, value } of toInsert) {
    prev = list.insertClone(prev, { prop, value, important: lane });
  }

  for (const d of representedDecls) {
    if (!fallbacks.has(d)) {
      list.remove(d);
    }
  }
}
