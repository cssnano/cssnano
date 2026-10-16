import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { generateCandidates } from '../../src/plugins/postcss-merge-longhand/lib/decl/borderCandidates.js';

const sides = ['top', 'right', 'bottom', 'left'];
const components = ['width', 'style', 'color'];
const values = ['1px', 'solid', 'red'];
/* Cell `s * 3 + c` is the longhand for side `s` and component `c`. */
const cellNames = sides.flatMap((side) =>
  components.map((component) => `border-${side}-${component}`)
);

/**
 * The physical border longhands a declaration sets, per CSS Backgrounds 3.
 *
 * @param {string} prop
 * @return {string[]}
 */
function physicalLonghands(prop) {
  if (prop === 'border') return cellNames;
  const [, first, second] = prop.split('-');
  if (second) return [prop];
  if (sides.includes(first)) {
    return components.map((component) => `${prop}-${component}`);
  }
  return sides.map((side) => `border-${side}-${first}`);
}

/**
 * Every 12-cell touched set, each cell set earlier by its own longhand to a
 * different value, so the candidates must synthesize every cell they cover.
 *
 * @param {boolean} hasReset
 * @return {Generator<{touched: Set<number>, candidates: {prop: string, value: string}[][]}>}
 */
function* everyTouchedSet(hasReset) {
  for (let set = 1; set < 2 ** 12; set++) {
    const touched = new Set();
    const cellHistory = cellNames.map((name, index) => {
      if (Math.floor(set / 2 ** index) % 2 === 0) return new Set();
      touched.add(index);
      return new Set([postcss.decl({ prop: name, value: 'initial-value' })]);
    });
    const cells = cellNames.map((_, index) => values[index % 3]);
    const candidates = generateCandidates(
      cells,
      cellHistory,
      touched,
      new Set(),
      hasReset,
      false,
      new Set()
    );
    yield { touched, candidates: candidates.map((c) => c.decls) };
  }
}

test('border candidates only set longhands the segment already sets', () => {
  for (const hasReset of [false, true]) {
    for (const { touched, candidates } of everyTouchedSet(hasReset)) {
      for (const decls of candidates) {
        for (const { prop } of decls) {
          for (const longhand of physicalLonghands(prop)) {
            assert.ok(
              touched.has(cellNames.indexOf(longhand)),
              `${prop} sets untouched ${longhand}`
            );
          }
        }
      }
    }
  }
});

test('border candidates emit the border reset, which also resets border-image, only after a border reset', () => {
  for (const { candidates } of everyTouchedSet(false)) {
    for (const decls of candidates) {
      assert.ok(!decls.some(({ prop }) => prop === 'border'));
    }
  }
});
