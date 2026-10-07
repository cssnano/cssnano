import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import { toLower } from '../parseWsc.js';
import { mergeBlockingSupport, needsUnmetSupport } from '../isFallback.js';
import {
  allBorderShorthands,
  cellProperties,
  componentCells,
  sideCells,
  sides,
  widthStyleColor as components,
} from './borderData.js';
import { declCost } from './slotVector.js';
/** @import {Declaration} from 'postcss'; */

/* Builds the reset shorthands, component shorthands, side shorthands and
 * leaves a border cover can choose from, together with the availability and
 * support analysis those shapes depend on. Selection and application live in
 * borderCandidates.js. */

/** @param {{prop: string, value: string}[]} decls @param {boolean} [important] */
function declSize(decls, important) {
  let sum = 0;
  for (const d of decls) sum += declCost(d.prop, d.value, important);
  return sum;
}
/** @param {string} prop @param {string} value */
const decl = (prop, value) => ({ prop, value });
/** @param {number} s @param {number} c @param {string} value */
const leaf = (s, c, value) => ({ prop: cellProperties[s * 3 + c], value });
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
 * A shorthand fills several cells, so a declaration appears once per cell it
 * set; collecting into a Set makes each one count once.
 *
 * @param {Set<Declaration>[]} cellHistory
 * @param {Iterable<number>} cellIndexes
 * @return {Set<Declaration>}
 */
function declarationsOfCells(cellHistory, cellIndexes) {
  /** @type {Set<Declaration>} */
  const decls = new Set();
  for (const index of cellIndexes) {
    for (const d of cellHistory[index]) decls.add(d);
  }
  return decls;
}
/**
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<Declaration>} fallbacks
 * @param {number} s
 * @return {boolean}
 */
function isSynthesizableSide(cellHistory, fallbacks, s) {
  const decls = declarationsOfCells(cellHistory, sideCells[s]);
  if (decls.size === 1) {
    const [only] = decls;
    const p = only.prop.toLowerCase();
    if (p === `border-${sides[s]}` || p === 'border') return true;
  }
  for (const d of decls) {
    if (fallbacks.has(d)) return false;
  }
  return true;
}
/**
 * @param {Set<Declaration>} decls
 * @return {boolean}
 */
function hasConsistentSupport(decls) {
  let s0;
  for (const d of decls) {
    const support = mergeBlockingSupport(d);
    s0 ??= support;
    if (support !== s0 && s0.symmetricDifference(support).size !== 0) {
      return false;
    }
  }
  return true;
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
        sideCells[s].every((i) => touched.has(i) && !barrierCells.has(i)) &&
        isSynthesizableSide(cellHistory, fallbacks, s)
    )
    .filter((s) =>
      hasConsistentSupport(declarationsOfCells(cellHistory, sideCells[s]))
    );
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
      componentCells[c].every((i) => touched.has(i) && !barrierCells.has(i))
    )
    .filter((c) =>
      hasConsistentSupport(declarationsOfCells(cellHistory, componentCells[c]))
    );
}

/**
 * Gives every touched cell that is neither blocked nor covered its own leaf,
 * and marks it covered.
 *
 * @param {string[]} cells
 * @param {Set<number>} touched
 * @param {Set<number>} blockedCells
 * @param {Set<number>} coveredCells
 * @return {{ prop: string, value: string }[]}
 */
function leavesOfFreeCells(cells, touched, blockedCells, coveredCells) {
  /** @type {{ prop: string, value: string }[]} */
  const leafDecls = [];
  for (let i = 0; i < 12; i++) {
    if (touched.has(i) && !blockedCells.has(i) && !coveredCells.has(i)) {
      coveredCells.add(i);
      leafDecls.push(leaf(Math.floor(i / 3), i % 3, cells[i]));
    }
  }
  return leafDecls;
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
  const leafDecls = leavesOfFreeCells(
    cells,
    touched,
    blockedCells,
    coveredCells
  );
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
  /** @type {Set<number>} */
  const coveredCells = new Set();
  return {
    decls: leavesOfFreeCells(cells, touched, blockedCells, coveredCells),
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
  const allDecls = declarationsOfCells(cellHistory, touched);
  for (const d of allDecls) {
    if (
      !allBorderShorthands.has(d.prop.toLowerCase()) &&
      needsUnmetSupport(d)
    ) {
      return [];
    }
  }
  for (const d of fallbacks) {
    if (d.prop.toLowerCase() !== 'border') return [];
  }

  if (!hasConsistentSupport(allDecls)) return [];
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

export {
  COMPONENT_SHORTHAND_CANDIDATE,
  LEAF_CANDIDATE,
  RESET_CANDIDATE,
  SIDE_SHORTHAND_CANDIDATE,
  createGroupCandidate,
  createLeafCandidate,
  createResetCandidates,
  declSize,
  declarationsOfCells,
  getAvailableComponents,
  getAvailableSides,
};
