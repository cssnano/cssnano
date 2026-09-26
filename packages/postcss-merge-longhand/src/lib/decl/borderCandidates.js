import insertCloned from '../insertCloned.js';
import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import { toLower } from '../parseWsc.js';
import spec, { setsLonghands } from '../spec.js';
import { mergeBlockingSupport, requiredSupport } from '../isFallback.js';
import {
  allSidesBorderShorthands,
  borderImageProperties,
  physicalBorderShorthands,
  widthStyleColor,
} from './borderData.js';
import { declCost } from './slotVector.js';
/** @import {Container, Declaration} from 'postcss'; */

/* Candidate generation for the border reducer: given the segment analysis
 * state (final cell values, cell history, barriers, fallbacks), produce and
 * score the non-overlapping covers — reset shorthands, component shorthands,
 * side shorthands, and leaves. */

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

/** @param {{prop: string, value: string}[]} decls @param {boolean} [important] */
function declSize(decls, important) {
  let sum = 0;
  for (const d of decls) sum += declCost(d.prop, d.value, important);
  return sum;
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
/** @param {string} prop @param {string} value */
const decl = (prop, value) => ({ prop, value });
/** @param {number} s @param {number} c @param {string} value */
const leaf = (s, c, value) => ({
  prop: `border-${sides[s]}-${components[c]}`,
  value,
});
/** @param {number} s @param {string} value */
const side = (s, value) => ({ prop: `border-${sides[s]}`, value });
/** @param {number} c @param {string} value */
const comp = (c, value) => ({ prop: `border-${components[c]}`, value });

/* Priority classes for a candidate's structure, cheapest first. On equal byte
 * cost a reset shorthand wins over component shorthands (`border-width`…),
 * those over side shorthands (`border-top`…), and leaves come last. */
const RESET_CANDIDATE = 1;
const COMPONENT_SHORTHAND_CANDIDATE = 2;
const SIDE_SHORTHAND_CANDIDATE = 3;
const LEAF_CANDIDATE = 4;

/** @param {string[]} cells @param {boolean} lane @param {{decls: {prop: string, value: string}[], rank: number}[]} rawCandidates */
function addResetCandidates(cells, lane, rawCandidates) {
  /** @type {string[][]} */
  const sideTriples = [];
  for (let s = 0; s < 4; s++) sideTriples.push(cells.slice(s * 3, s * 3 + 3));

  const seen = new Set(),
    uniqueTriples = [];
  for (const t of sideTriples) {
    const key = t.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTriples.push(t);
    }
  }

  for (const base of uniqueTriples) {
    const borderDecl = decl('border', minifyWidthStyleColor(base.join(' ')));
    const corrections = [];
    for (let s = 0; s < 4; s++) {
      const t = sideTriples[s];
      if (t[0] === base[0] && t[1] === base[1] && t[2] === base[2]) continue;
      const asSide = [side(s, minifyWidthStyleColor(t.join(' ')))];
      const asLeaves = [];
      for (let c = 0; c < 3; c++) {
        if (t[c] !== base[c]) {
          const val =
            t[c].toLowerCase() === 'currentcolor' ? 'currentcolor' : t[c];
          asLeaves.push(leaf(s, c, val));
        }
      }
      if (
        asLeaves.length === 1 &&
        asLeaves[0].prop.endsWith('-color') &&
        asLeaves[0].value.toLowerCase() === 'currentcolor'
      ) {
        corrections.push(...asLeaves);
      } else {
        const isSideSmaller = declSize(asSide, lane) < declSize(asLeaves, lane);
        corrections.push(...(isSideSmaller ? asSide : asLeaves));
      }
    }
    rawCandidates.push({
      decls: [borderDecl, ...corrections],
      rank: RESET_CANDIDATE,
    });
  }

  for (const c of [2, 1, 0]) {
    const [o1, o2] = [0, 1, 2].filter((x) => x !== c);
    const t0 = sideTriples[0];
    if (sideTriples.every((t) => t[o1] === t0[o1] && t[o2] === t0[o2])) {
      const bTriple = ['', '', ''];
      bTriple[o1] = t0[o1] || '';
      bTriple[o2] = t0[o2] || '';
      const bVal = minifyWidthStyleColor(bTriple.join(' '));
      const rawComp = `${cells[c]} ${cells[3 + c]} ${cells[6 + c]} ${cells[9 + c]}`;
      rawCandidates.push({
        decls: [decl('border', bVal), comp(c, minifyTrbl(toLower(rawComp)))],
        rank: RESET_CANDIDATE,
      });
    }
  }
}
/**
 * A side cannot be synthesized from partial declarations if any contributing
 * declaration requires conditional syntax support (such as rgba() or calc())
 * or acts as a fallback, because user agents lacking that support would reject
 * the entire synthesized shorthand and drop the surviving components.
 *
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<Declaration>} fallbacks
 * @param {number} s
 * @return {boolean}
 */
function isSynthesizableSide(cellHistory, fallbacks, s) {
  const decls = [0, 1, 2].flatMap((c) => [...cellHistory[s * 3 + c]]);
  if (decls.length === 0) return true;
  const uniqueDecls = new Set(decls);
  if (
    uniqueDecls.size === 1 &&
    ([...uniqueDecls][0].prop.toLowerCase() === `border-${sides[s]}` ||
      [...uniqueDecls][0].prop.toLowerCase() === 'border')
  ) {
    return true;
  }
  return !decls.some((d) => fallbacks.has(d));
}
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {Set<Declaration>} fallbacks
 * @return {number[]}
 */
function getAvailableSides(cellHistory, touched, barrierCells, fallbacks) {
  return [0, 1, 2, 3]
    .filter(
      (s) =>
        [0, 1, 2].every(
          (c) => touched.has(s * 3 + c) && !barrierCells.has(s * 3 + c)
        ) && isSynthesizableSide(cellHistory, fallbacks, s)
    )
    .filter((s) => {
      const decls = [0, 1, 2].flatMap((c) => [...cellHistory[s * 3 + c]]);
      if (decls.length === 0) return true;
      const s0 = mergeBlockingSupport(decls[0]);
      return decls.every(
        (d) => s0.symmetricDifference(mergeBlockingSupport(d)).size === 0
      );
    });
}
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @return {number[]}
 */
function getAvailableComponents(cellHistory, touched, barrierCells) {
  return [2, 1, 0]
    .filter((c) =>
      [0, 1, 2, 3].every(
        (s) => touched.has(s * 3 + c) && !barrierCells.has(s * 3 + c)
      )
    )
    .filter((c) => {
      const decls = [0, 1, 2, 3].flatMap((s) => [...cellHistory[s * 3 + c]]);
      if (decls.length === 0) return true;
      const s0 = mergeBlockingSupport(decls[0]);
      return decls.every(
        (d) => s0.symmetricDifference(mergeBlockingSupport(d)).size === 0
      );
    });
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
 * @param {number[][]} groups
 * @param {string[]} cells
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @param {boolean} componentGroups
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }}
 */
function createGroupCandidate(
  groups,
  cells,
  touched,
  blockedCells,
  componentGroups
) {
  /** @type {Set<number>} */
  const coveredCells = new Set();
  const sortedGroups = [...groups].toSorted((a, b) =>
    componentGroups ? (b[0] % 3) - (a[0] % 3) : a[0] - b[0]
  );
  const groupDecls = sortedGroups.map((group) => {
    for (const i of group) coveredCells.add(i);
    const groupValues = group.map((i) => cells[i]);
    if (componentGroups) {
      const c = group[0] % 3;
      return comp(
        c,
        minifyTrbl(groups.length === 3 ? groupValues.map(toLower) : groupValues)
      );
    }
    return side(
      Math.floor(group[0] / 3),
      minifyWidthStyleColor(groupValues.join(' '))
    );
  });
  /** @type {{ prop: string, value: string }[]} */
  const leafDecls = [];
  for (let i = 0; i < 12; i++) {
    if (touched.has(i) && !blockedCells.has(i) && !coveredCells.has(i)) {
      coveredCells.add(i);
      leafDecls.push(leaf(Math.floor(i / 3), i % 3, cells[i]));
    }
  }
  const mask = sortedGroups.reduce(
    (acc, group) =>
      acc +
      Math.pow(
        2,
        componentGroups ? group[0] % 3 : 3 - Math.floor(group[0] / 3)
      ),
    0
  );
  return {
    decls: [...groupDecls, ...leafDecls],
    rank: componentGroups
      ? COMPONENT_SHORTHAND_CANDIDATE
      : SIDE_SHORTHAND_CANDIDATE,
    mask,
    coveredCells,
  };
}
/**
 * @param {string[]} cells
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }}
 */
function createLeafCandidate(cells, touched, blockedCells) {
  /** @type {{ prop: string, value: string }[]} */
  const leafDecls = [];
  const coveredCells = new Set();
  for (let i = 0; i < 12; i++) {
    if (touched.has(i) && !blockedCells.has(i)) {
      coveredCells.add(i);
      leafDecls.push(leaf(Math.floor(i / 3), i % 3, cells[i]));
    }
  }
  return {
    decls: leafDecls,
    rank: LEAF_CANDIDATE,
    mask: 0,
    coveredCells,
  };
}
/**
 * @param {boolean} hasReset
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {Set<Declaration>[]} cellHistory
 * @param {string[]} cells
 * @param {boolean} lane
 * @param {Set<Declaration>} fallbacks
 * @return {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex: number, coveredCells: Set<number> }[]}
 */
function createResetCandidates(
  hasReset,
  touched,
  barrierCells,
  cellHistory,
  cells,
  lane,
  fallbacks
) {
  if (!hasReset || touched.size !== 12 || barrierCells.size !== 0) return [];
  const allDecls = Array.from(touched).flatMap((idx) => [...cellHistory[idx]]);
  const hasPartialSupportOrFallback =
    allDecls.some(
      (d) =>
        !physicalBorderShorthands.includes(d.prop.toLowerCase()) &&
        d.prop.toLowerCase() !== 'border' &&
        !allSidesBorderShorthands.includes(d.prop.toLowerCase()) &&
        requiredSupport(d).size > 0
    ) || [...fallbacks].some((d) => d.prop.toLowerCase() !== 'border');
  if (hasPartialSupportOrFallback) return [];

  const s0 = allDecls.length ? mergeBlockingSupport(allDecls[0]) : null;
  const uniformSupport =
    !s0 ||
    allDecls.every(
      (d) => s0.symmetricDifference(mergeBlockingSupport(d)).size === 0
    );
  if (!uniformSupport) return [];
  /** @type {{decls: {prop: string, value: string}[], rank: number}[]} */
  const rawReset = [];
  addResetCandidates(cells, lane, rawReset);
  const coveredCells = new Set(touched);
  return rawReset.map((item, resetIndex) => ({
    decls: item.decls,
    rank: item.rank,
    mask: 0,
    resetIndex,
    coveredCells,
  }));
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
