import insertCloned from '../insertCloned.js';
import minifyTrbl from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import parseTrbl from '../parseTrbl.js';
import parseWidthStyleColor from '../parseWsc.js';
import spec, { setsLonghands } from '../spec.js';
import stylehacks from 'stylehacks';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import isCustomProp from '../isCustomProp.js';
import { requiredSupport } from '../isFallback.js';
import {
  browserKeeps,
  containsUnmergeableBorderDecls,
  hasBorderResetContext,
} from './borderValidation.js';
import {
  allPhysicalBorderProperties,
  allSidesBorderShorthands,
  borderImageProperties,
  physicalBorderShorthands,
  widthStyleColor,
} from './borderData.js';

/** @import {Declaration, Rule} from 'postcss'; */

const sides = spec.sides,
  components = widthStyleColor;

/** @param {{prop: string, value: string}[]} decls @param {boolean} [important] */
function declSize(decls, important) {
  let sum = 0;
  for (const d of decls)
    sum += d.prop.length + d.value.length + 2 + (important ? 10 : 0);
  return sum;
}

/** @param {Rule} rule */
function hasForeignBorderNodes(rule) {
  for (const node of rule.nodes) {
    if (node.type !== 'decl') continue;
    const p = node.prop.toLowerCase();
    if (
      borderImageProperties.has(p) ||
      spec.flowRelativeBorderProperties.has(p)
    )
      return true;
    if (
      p.startsWith('border-') &&
      !allPhysicalBorderProperties.has(p) &&
      p !== 'border-spacing'
    ) {
      return true;
    }
  }
  return false;
}

/** @param {Declaration[]} declarations @param {boolean} hasReset @param {boolean} unmergeable */
function hasMixedBorderShapes(declarations, hasReset, unmergeable) {
  const hasLong = declarations.some((d) => d.prop.split('-').length === 3);
  const hasComp = declarations.some((d) =>
    allSidesBorderShorthands.includes(d.prop.toLowerCase())
  );
  const hasSide = declarations.some((d) =>
    physicalBorderShorthands.includes(d.prop.toLowerCase())
  );
  if (hasReset) return hasLong || (hasComp && !unmergeable);
  return (hasSide && hasComp) || (hasSide && hasLong);
}

/** @param {Declaration[]} declarations */
function computeTouchedCells(declarations) {
  const touched = new Set();
  for (const d of declarations) {
    const p = d.prop.toLowerCase();
    if (p === 'border') {
      for (let i = 0; i < 12; i++) touched.add(i);
    } else if (physicalBorderShorthands.includes(p)) {
      const s = sides.indexOf(p.slice(7));
      for (let c = 0; c < 3; c++) touched.add(s * 3 + c);
    } else if (allSidesBorderShorthands.includes(p)) {
      const c = components.indexOf(p.slice(7));
      for (let s = 0; s < 4; s++) touched.add(s * 3 + c);
    } else {
      const [sName, cName] = p.slice(7).split('-');
      const s = sides.indexOf(sName),
        c = components.indexOf(cName);
      if (s !== -1 && c !== -1) touched.add(s * 3 + c);
    }
  }
  return touched;
}

/** @param {Rule} rule @param {Declaration[]} declarations */
export function isConcreteBorder(rule, declarations) {
  if (declarations.length === 0) return false;
  const lane = declarations[0].important;
  /** @param {Declaration} d */
  const badDecl = (d) => {
    const p = d.prop.toLowerCase();
    return (
      d.important !== lane ||
      d.prop !== p ||
      !allPhysicalBorderProperties.has(p) ||
      stylehacks.detect(d) ||
      isCustomProp(d) ||
      cssGlobalKeywords.has(d.value.toLowerCase()) ||
      requiredSupport(d).size > 0 ||
      !browserKeeps(d)
    );
  };
  if (declarations.some(badDecl) || hasForeignBorderNodes(rule)) return false;

  const hasReset = declarations.some((d) => d.prop.toLowerCase() === 'border');
  const unmergeable = containsUnmergeableBorderDecls(rule);
  if (unmergeable) return hasReset;
  if (hasMixedBorderShapes(declarations, hasReset, unmergeable)) return false;

  const touched = computeTouchedCells(declarations);
  return touched.size === 12 || (hasReset && touched.size > 0);
}

/** @param {{prop: string, value: string}[]} candDecls @param {Set<number>} touched @param {boolean} hasReset */
function footprintValid(candDecls, touched, hasReset) {
  for (const { prop } of candDecls) {
    for (const p of setsLonghands(prop.toLowerCase())) {
      if (borderImageProperties.has(p) && !hasReset) return false;
      const [sName, cName] = p.slice(7).split('-');
      const s = sides.indexOf(sName),
        c = components.indexOf(cName);
      if (s !== -1 && c !== -1 && !touched.has(s * 3 + c)) return false;
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

/** @param {(string | null)[]} cells @param {boolean} lane @param {{prop: string, value: string}[][]} rawCandidates */
function addResetCandidates(cells, lane, rawCandidates) {
  /** @type {(string | null)[][]} */
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
        if (t[c] !== base[c])
          asLeaves.push(leaf(s, c, /** @type {string} */ (t[c])));
      }
      const isSideSmaller = declSize(asSide, lane) < declSize(asLeaves, lane);
      corrections.push(...(isSideSmaller ? asSide : asLeaves));
    }
    rawCandidates.push([borderDecl, ...corrections]);
  }

  for (let c = 0; c < 3; c++) {
    const [o1, o2] = [0, 1, 2].filter((x) => x !== c);
    const t0 = sideTriples[0];
    if (sideTriples.every((t) => t[o1] === t0[o1] && t[o2] === t0[o2])) {
      const bTriple = ['', '', ''];
      bTriple[o1] = t0[o1] || '';
      bTriple[o2] = t0[o2] || '';
      const bVal = minifyWidthStyleColor(bTriple.join(' '));
      const rawComp = `${cells[c]} ${cells[3 + c]} ${cells[6 + c]} ${cells[9 + c]}`;
      rawCandidates.push([decl('border', bVal), comp(c, minifyTrbl(rawComp))]);
    }
  }
}

const SIDE_GROUPS = [0, 1, 2, 3].map((s) => [s * 3, s * 3 + 1, s * 3 + 2]);
const COMP_GROUPS = [2, 1, 0].map((c) => [c, 3 + c, 6 + c, 9 + c]);

/** @param {number[][]} groups @param {(i: number) => {prop: string, value: string}} shorthand @param {(string | null)[]} cells @param {Set<number>} touched */
const emitGroup = (groups, shorthand, cells, touched) =>
  groups.flatMap((grp, i) =>
    grp.every((idx) => touched.has(idx))
      ? [shorthand(i)]
      : grp
          .filter((idx) => touched.has(idx))
          .map((idx) =>
            leaf(
              Math.floor(idx / 3),
              idx % 3,
              /** @type {string} */ (cells[idx])
            )
          )
  );

/** @param {(string | null)[]} cells @param {Set<number>} touched @param {boolean} hasReset @param {boolean} lane */
function generateCandidates(cells, touched, hasReset, lane) {
  const leaves = [];
  for (let i = 0; i < 12; i++) {
    if (touched.has(i))
      leaves.push(
        leaf(Math.floor(i / 3), i % 3, /** @type {string} */ (cells[i]))
      );
  }
  const sideDecls = emitGroup(
    SIDE_GROUPS,
    (s) =>
      side(
        s,
        minifyWidthStyleColor(
          `${cells[s * 3]} ${cells[s * 3 + 1]} ${cells[s * 3 + 2]}`
        )
      ),
    cells,
    touched
  );
  const compDecls = emitGroup(
    COMP_GROUPS,
    (i) => {
      const c = [2, 1, 0][i];
      return comp(
        c,
        minifyTrbl(
          `${cells[c]} ${cells[3 + c]} ${cells[6 + c]} ${cells[9 + c]}`
        )
      );
    },
    cells,
    touched
  );
  /** @type {{prop: string, value: string}[][]} */
  const raw = [leaves, sideDecls, compDecls];
  if (hasReset && touched.size === 12) addResetCandidates(cells, lane, raw);
  return raw.filter((cand) => footprintValid(cand, touched, hasReset));
}

/** @param {Declaration[]} decls @param {(string | null)[]} cells @param {Set<number>} touched @param {Declaration[]} contributing */
function populateBorderCells(decls, cells, touched, contributing) {
  let hasReset = false;
  for (const d of decls) {
    const prop = d.prop.toLowerCase();
    if (prop === 'border' || physicalBorderShorthands.includes(prop)) {
      const isB = prop === 'border';
      const sList = isB ? [0, 1, 2, 3] : [sides.indexOf(prop.slice(7))];
      const [w, st, clr] = parseWidthStyleColor(d.value);
      const triple = [w || 'medium', st || 'none', clr || 'currentcolor'];
      for (const s of sList) {
        for (let c = 0; c < 3; c++) {
          cells[s * 3 + c] = triple[c];
          touched.add(s * 3 + c);
        }
      }
      if (isB) hasReset = true;
      contributing.push(d);
    } else if (allSidesBorderShorthands.includes(prop)) {
      const c = components.indexOf(prop.slice(7));
      const vals = parseTrbl(d.value.toLowerCase());
      for (let s = 0; s < 4; s++) {
        cells[s * 3 + c] = vals[s];
        touched.add(s * 3 + c);
      }
      contributing.push(d);
    } else {
      const [sName, cName] = prop.slice(7).split('-');
      const s = sides.indexOf(sName),
        c = components.indexOf(cName);
      if (s !== -1 && c !== -1) {
        cells[s * 3 + c] = d.value.toLowerCase();
        touched.add(s * 3 + c);
        contributing.push(d);
      }
    }
  }
  return hasReset;
}

/** @param {Declaration} d */
function normalizeBorderSingleton(d) {
  const p = d.prop.toLowerCase();
  if (p === 'border' || physicalBorderShorthands.includes(p)) {
    d.prop = p;
    d.value = minifyWidthStyleColor(d.value);
  } else if (allSidesBorderShorthands.includes(p)) {
    d.prop = p;
    d.value = minifyTrbl(d.value);
  }
}

/** @param {Rule} rule @param {Declaration[]} [declarations] @param {boolean} [hasResetContext] */
export function reduceBorder(rule, declarations, hasResetContext) {
  const decls =
    declarations ??
    (rule.nodes
      ? /** @type {Declaration[]} */ (
          rule.nodes.filter(
            (n) =>
              n.type === 'decl' && n.prop.toLowerCase().startsWith('border')
          )
        )
      : []);
  if (decls.length === 0) return;
  if (decls.length === 1) {
    normalizeBorderSingleton(decls[0]);
    return;
  }

  const lane = decls[0].important;
  /** @type {(string | null)[]} */
  const cells = Array.from({ length: 12 }, () => null);
  const touched = new Set();
  /** @type {Declaration[]} */
  const contributing = [];
  const resetFound = populateBorderCells(decls, cells, touched, contributing);
  if (contributing.length === 0) return;

  const hasReset =
    (hasResetContext ?? hasBorderResetContext(rule)) || resetFound;
  const candidates = generateCandidates(cells, touched, hasReset, lane);
  if (candidates.length === 0) return;

  let best = candidates[0];
  let bestSize = declSize(best, lane);
  for (let i = 1; i < candidates.length; i++) {
    const s = declSize(candidates[i], lane);
    if (s <= bestSize) {
      best = candidates[i];
      bestSize = s;
    }
  }

  const origSize = declSize(contributing, lane);
  const isIdenticalOrder =
    best.length === contributing.length &&
    best.every(
      (d, i) => d.prop.toLowerCase() === contributing[i].prop.toLowerCase()
    );
  if (bestSize > origSize || (bestSize === origSize && isIdenticalOrder))
    return;

  let anchor = contributing[0];
  for (const d of contributing)
    if (rule.index(d) > rule.index(anchor)) anchor = d;
  let prev = anchor;
  for (const { prop, value } of best) {
    prev = insertCloned(rule, prev, { prop, value, important: lane });
  }
  for (const d of contributing) d.remove();
}
