import insertCloned from '../insertCloned.js';
import spec, { setsLonghands } from '../spec.js';
import {
  allSidesBorderShorthands,
  borderImageProperties,
  physicalBorderShorthands,
  widthStyleColor,
} from './borderData.js';
import {
  COMPONENT_SHORTHAND_CANDIDATE,
  RESET_CANDIDATE,
  SIDE_SHORTHAND_CANDIDATE,
  createGroupCandidate,
  createLeafCandidate,
  createResetCandidates,
  declSize,
  getAvailableComponents,
  getAvailableSides,
} from './borderCandidateBuilders.js';
/** @import {Container, Declaration} from 'postcss'; */

/* Selection and application for the border reducer: given the candidates the
 * builders produce and the segment analysis state (final cell values, cell
 * history, barriers, fallbacks), score the non-overlapping covers and rewrite
 * the rule. Candidate construction lives in borderCandidateBuilders.js. */

const sides = spec.sides,
  components = widthStyleColor;

/** @type {Map<string, number>} */
const borderPropertyToCellIndex = new Map();
for (let s = 0; s < sides.length; s++) {
  for (let c = 0; c < components.length; c++) {
    borderPropertyToCellIndex.set(
      `border-${sides[s]}-${components[c]}`,
      s * 3 + c
    );
  }
}

/** @param {{prop: string, value: string}[]} candDecls @param {Set<number>} touched @param {boolean} hasReset */
function footprintValid(candDecls, touched, hasReset) {
  for (const { prop } of candDecls) {
    for (const p of setsLonghands(prop.toLowerCase())) {
      if (borderImageProperties.has(p) && !hasReset) return false;
      const cellIndex = borderPropertyToCellIndex.get(p);
      if (cellIndex !== undefined && !touched.has(cellIndex)) return false;
    }
  }
  return true;
}
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
  /* Broader coverage wins when the same shorthand family ties. */
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
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {boolean} hasReset
 * @param {boolean} lane
 * @param {Set<Declaration>} fallbacks
 */
export function generateCandidates(
  cells,
  cellHistory,
  touched,
  barrierCells,
  hasReset,
  lane,
  fallbacks
) {
  const availSides = getAvailableSides(
    cellHistory,
    touched,
    barrierCells,
    fallbacks
  );
  const availComps = getAvailableComponents(cellHistory, touched, barrierCells);

  const protectedCells = new Set(
    [...touched].filter((idx) =>
      [...cellHistory[idx]].some((d) => fallbacks.has(d))
    )
  );
  const existingLeafCells = new Set(
    [...touched].filter((idx) => {
      const prop = `border-${sides[Math.floor(idx / 3)]}-${components[idx % 3]}`;
      return [...cellHistory[idx]].some(
        (d) =>
          d.prop.toLowerCase() === prop &&
          d.value.toLowerCase() === cells[idx].toLowerCase()
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
    lane,
    fallbacks
  );

  const compCands = getSubsets(availComps)
    .map((sub) =>
      createGroupCandidate(
        sub.map((c) => [c, c + 3, c + 6, c + 9]),
        cells,
        touched,
        blockedCells,
        true
      )
    )
    .toSorted((a, b) => b.mask - a.mask);

  const sideCands = getSubsets(availSides)
    .map((sub) =>
      createGroupCandidate(
        sub.map((s) => [s * 3, s * 3 + 1, s * 3 + 2]),
        cells,
        touched,
        blockedCells,
        false
      )
    )
    .toSorted((a, b) => b.mask - a.mask);

  const leafCand = createLeafCandidate(cells, touched, blockedCells);

  const candidates = [...resetCands, ...compCands, ...sideCands, leafCand];

  return candidates.filter((c) => footprintValid(c.decls, touched, hasReset));
}
/**
 * @param {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex?: number, coveredCells: Set<number> }[]} candidates
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<Declaration>} fallbacks
 * @param {Set<number>} touched
 * @param {boolean} lane
 * @param {Declaration[]} segment
 * @return {{ cand: (typeof candidates)[0], repList: Declaration[], removable: Declaration[], diff: number, size: number, fallbacks: Set<Declaration> } | null}
 */
export function selectBestCandidate(
  candidates,
  cellHistory,
  fallbacks,
  touched,
  lane,
  segment
) {
  const allTouchedDecls = new Set();
  for (const idx of touched) {
    for (const d of cellHistory[idx]) {
      allTouchedDecls.add(d);
    }
  }
  const allRemovable = [...allTouchedDecls].filter((d) => !fallbacks.has(d));
  const originalSize = declSize(allRemovable, lane);

  /** @type {{ cand: (typeof candidates)[0], repList: Declaration[], removable: Declaration[], diff: number, size: number, fallbacks: Set<Declaration> } | null} */
  let best = null;

  for (const cand of candidates) {
    if (cand.coveredCells.size === 0) continue;
    const candSize = declSize(cand.decls, lane);
    if (candSize > originalSize) continue;

    const rep = new Set();
    for (const idx of cand.coveredCells) {
      for (const d of cellHistory[idx]) {
        rep.add(d);
      }
    }
    if (rep.size === 0) continue;
    const repList = segment.filter((d) => rep.has(d));
    const removable = repList.filter((d) => !fallbacks.has(d));
    const removableSet = new Set(removable);

    /* A declaration can contribute one cell to a candidate while still
     * controlling other cells. Removing it in that situation would silently
     * drop those values. Synthetic leaves normally complete the footprint;
     * barriers and preserved fallbacks deliberately prevent that completion. */
    const removesOutsideFootprint = removable.some((d) =>
      [...setsLonghands(d.prop.toLowerCase())].some((p) => {
        const cellIndex = borderPropertyToCellIndex.get(p);
        return cellIndex !== undefined && !cand.coveredCells.has(cellIndex);
      })
    );
    if (removesOutsideFootprint) continue;

    const remaining = allRemovable.filter((d) => !removableSet.has(d));
    const size = candSize + declSize(remaining, lane);
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
 * @param {Container} rule
 * @param {{ cand: { decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }, repList: Declaration[], removable: Declaration[], diff: number, size: number, fallbacks: Set<Declaration> }} best
 * @param {Declaration[]} segment
 * @param {boolean} lane
 */
export function applyBestCandidate(rule, best, segment, lane) {
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
      bestCand.decls.every(
        (d, i) => d.prop === repList[i].prop && d.value === repList[i].value
      );
    if (isIdentical) return;
  }

  const representedDecls = new Set(repList);

  const anchor = repList.at(-1);
  if (!anchor) return;

  /** @type {{prop: string, value: string}[]} */
  const toInsert = [];
  for (const candDecl of bestCand.decls) {
    const p = candDecl.prop.toLowerCase();
    const isShorthand =
      p === 'border' ||
      physicalBorderShorthands.includes(p) ||
      allSidesBorderShorthands.includes(p);
    if (isShorthand) {
      toInsert.push(candDecl);
    } else {
      const alreadyPresent = segment.find(
        (d) =>
          !representedDecls.has(d) &&
          d.prop.toLowerCase() === p &&
          d.value.toLowerCase() === candDecl.value.toLowerCase()
      );
      if (!alreadyPresent) {
        toInsert.push(candDecl);
      }
    }
  }

  let prev = anchor;
  for (const { prop, value } of toInsert) {
    prev = insertCloned(rule, prev, { prop, value, important: lane });
  }

  for (const d of representedDecls) {
    if (!fallbacks.has(d)) {
      d.remove();
    }
  }
}
