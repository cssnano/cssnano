import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import plugin from '../src/index.js';

const sides = ['top', 'right', 'bottom', 'left'];
const components = ['width', 'style', 'color'];
const values = ['1px', 'solid', 'red'];
const hasMaskBit = (mask, bit) => Math.floor(mask / Math.pow(2, bit)) % 2 === 1;

/** @param {string[]} input */
function minifyTrbl(input) {
  if (input[0] === input[1] && input[0] === input[2] && input[0] === input[3]) {
    return input[0];
  }
  if (input[0] === input[2] && input[1] === input[3]) {
    return `${input[0]} ${input[1]}`;
  }
  if (input[1] === input[3]) return `${input[0]} ${input[1]} ${input[2]}`;
  return input.join(' ');
}

/** @param {string} prop @param {string} value @param {boolean} important */
function declaration(prop, value, important) {
  return { prop, value, important };
}

/** @param {{ prop: string, value: string, important: boolean }[]} decls */
function cost(decls) {
  let total = 0;
  for (const d of decls) {
    total += d.prop.length + d.value.length + (d.important ? 12 : 2);
  }
  return total;
}

/** @param {number} mask */
function selectedCells(mode, mask) {
  const cells = new Set();
  for (let s = 0; s < 4; s++) {
    for (let c = 0; c < 3; c++) {
      const selected =
        mode === 'side' ? hasMaskBit(mask, 3 - s) : hasMaskBit(mask, c);
      if (selected) cells.add(s * 3 + c);
    }
  }
  return cells;
}

/** @param {Set<number>} cells @param {number} c */
function hasComponent(cells, c) {
  return [0, 1, 2, 3].every((s) => cells.has(s * 3 + c));
}

/** @param {Set<number>} cells @param {number} s */
function hasSide(cells, s) {
  return [0, 1, 2].every((c) => cells.has(s * 3 + c));
}

/** @param {Set<number>} covered @param {number} i */
function leafFor(i, important) {
  return declaration(
    `border-${sides[Math.floor(i / 3)]}-${components[i % 3]}`,
    values[i % 3],
    important
  );
}

/**
 * Enumerates the legal covers without importing the reducer's candidate
 * generator. A candidate is either a non-empty subset of rows, a non-empty
 * subset of columns, or the leaf cover. Every remaining touched cell is an
 * explicitly serialized leaf; rows and columns are never mixed.
 *
 * @param {'side' | 'component'} mode
 * @param {number} inputMask
 * @param {boolean} important
 */
function oracle(mode, inputMask, important) {
  const touched = selectedCells(mode, inputMask);
  /** @type {{ prop: string, value: string, important: boolean }[]} */
  const source = [...touched].map((i) => leafFor(i, important));
  /** @type {{ decls: { prop: string, value: string, important: boolean }[], rank: number, mask: number }[]} */
  const candidates = [];

  for (let mask = 1; mask < Math.pow(2, 3); mask++) {
    const cols = [0, 1, 2].filter((c) => hasMaskBit(mask, c));
    if (!cols.every((c) => hasComponent(touched, c))) continue;
    const covered = new Set(cols.flatMap((c) => [c, 3 + c, 6 + c, 9 + c]));
    const decls = cols
      .toSorted((a, b) => b - a)
      .map((c) =>
        declaration(
          `border-${components[c]}`,
          minifyTrbl([c, c + 3, c + 6, c + 9].map((i) => values[i % 3])),
          important
        )
      );
    for (const i of [...touched].toSorted((a, b) => a - b)) {
      if (!covered.has(i)) {
        covered.add(i);
        decls.push(leafFor(i, important));
      }
    }
    candidates.push({ decls, rank: 2, mask });
  }

  for (let mask = 1; mask < Math.pow(2, 4); mask++) {
    const rows = [0, 1, 2, 3].filter((s) => hasMaskBit(mask, 3 - s));
    if (!rows.every((s) => hasSide(touched, s))) continue;
    const covered = new Set(rows.flatMap((s) => [s * 3, s * 3 + 1, s * 3 + 2]));
    const decls = rows.map((s) =>
      declaration(
        `border-${sides[s]}`,
        `${values[0]} ${values[1]} ${values[2]}`,
        important
      )
    );
    for (const i of [...touched].toSorted((a, b) => a - b)) {
      if (!covered.has(i)) {
        covered.add(i);
        decls.push(leafFor(i, important));
      }
    }
    candidates.push({ decls, rank: 3, mask });
  }

  candidates.push({
    decls: [...touched]
      .toSorted((a, b) => a - b)
      .map((i) => leafFor(i, important)),
    rank: 4,
    mask: 0,
  });

  const sourceCost = cost(source);
  let best = null;
  for (const candidate of candidates) {
    const candidateCost = cost(candidate.decls);
    if (candidateCost > sourceCost) continue;
    if (!best) {
      best = candidate;
      continue;
    }
    const winnerCost = cost(best.decls);
    if (candidateCost !== winnerCost) {
      if (candidateCost < winnerCost) best = candidate;
      continue;
    }
    if (candidate.rank !== best.rank) {
      if (candidate.rank < best.rank) best = candidate;
      continue;
    }
    if (candidate.mask > best.mask) best = candidate;
  }

  return best ?? { decls: source, rank: 5, mask: 0 };
}

/** @param {'side' | 'component'} mode @param {number} mask @param {boolean} important */
async function checkMask(mode, mask, important) {
  const cells = selectedCells(mode, mask);
  const input = [...cells]
    .toSorted((a, b) => a - b)
    .map((i) => {
      const d = leafFor(i, important);
      return `${d.prop}:${d.value}${important ? '!important' : ''}`;
    })
    .join(';');
  const result = await postcss([plugin()]).process(`a{${input}}`, {
    from: undefined,
  });
  const actual = /** @type {import('postcss').Rule} */ (
    postcss.parse(result.css).first
  ).nodes
    .filter((node) => node.type === 'decl')
    .map((node) => {
      const d = /** @type {import('postcss').Declaration} */ (node);
      return declaration(d.prop, d.value, Boolean(d.important));
    });
  const expected = oracle(mode, mask, important).decls;

  assert.deepEqual(
    actual,
    expected,
    `${mode} mask ${mask}, important ${important}`
  );
  assert.equal(cost(actual), cost(expected));

  const outputHasSide = actual.some((d) =>
    sides.some((s) => d.prop === `border-${s}`)
  );
  const outputHasComponent = actual.some((d) =>
    components.some((c) => d.prop === `border-${c}`)
  );
  assert.equal(
    outputHasSide && outputHasComponent,
    false,
    `${mode} mask ${mask} crossed side/component footprints`
  );
}

for (const important of [false, true]) {
  for (const [mode, count] of [
    /** @type {const} */ (['side', 16]),
    /** @type {const} */ (['component', 8]),
  ]) {
    for (let mask = 1; mask < count; mask++) {
      test(`planner oracle: ${mode} mask ${mask}, important ${important}`, () =>
        checkMask(mode, mask, important));
    }
  }
}
