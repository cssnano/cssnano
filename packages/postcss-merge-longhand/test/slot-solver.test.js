import { describe, test } from 'node:test';
import postcss from 'postcss';
import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { shortestWithFreeSlots } from '../src/lib/decl/slotSolver.js';
import minifyTrbl from '../src/lib/minifyTrbl.js';
import { minifyPair } from '../src/lib/pairs.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const modern = { overrideBrowserslist: ['chrome 120'] };
const legacy = { overrideBrowserslist: ['ie 11'] };
/* Before dvh, cap and the axis shorthands arrived. */
const older = { overrideBrowserslist: ['chrome 100'] };

describe('values a later declaration overrides', () => {
  test(
    'repeats a neighbour in the slots of a physical shorthand that later longhands override across a barrier',
    processCSS(
      'a{margin:1px 2px 3px 4px;margin-inline-start:0;margin-left:2px;margin-right:2px}',
      'a{margin:1px 1px 3px;margin-inline-start:0;margin-left:2px;margin-right:2px}',
      modern
    )
  );

  test(
    'repeats a neighbour in the slot of an axis shorthand that a later longhand overrides across a physical barrier',
    processCSS(
      'a{margin-block:8px 4px;margin-top:1px;margin-block-start:6px}',
      'a{margin-block:4px;margin-top:1px;margin-block-start:6px}',
      modern
    )
  );

  test(
    'repeats a neighbour in the slot of an axis shorthand that its longhand cannot fold into',
    processCSS(
      'a{margin-block:8px 4px;margin-block-start:6px}',
      'a{margin-block:4px;margin-block-start:6px}',
      legacy
    )
  );

  test(
    'chooses the free slot against the shorthand the folds produce, not the original',
    processCSS(
      'a{margin:1px 2px 3px 4px;margin-left:2px;margin-inline-start:0;margin-top:3px}',
      'a{margin:3px 2px;margin-inline-start:0;margin-top:3px}',
      modern
    )
  );

  test(
    'chooses the free slot against the folded shorthand for targets without the axis shorthands too',
    processCSS(
      'a{margin:1px 2px 3px 4px;margin-left:2px;margin-inline-start:0;margin-top:3px}',
      'a{margin:3px 2px;margin-inline-start:0;margin-top:3px}',
      legacy
    )
  );

  test(
    'frees a slot that a later CSS-wide keyword overrides',
    processCSS(
      'a{margin:1px 2px 3px 4px;margin-left:inherit}',
      'a{margin:1px 2px 3px;margin-left:inherit}',
      modern
    )
  );

  test(
    'prefers the value of the opposite side, then the earliest slot, so equal values tie the same way',
    processCSS(
      'a{margin:1px 2px 3px 4px;margin-inline-start:0;margin-left:5px;margin-right:5px}',
      'a{margin:1px 1px 3px;margin-inline-start:0;margin-left:5px;margin-right:5px}',
      modern
    )
  );

  test('gives byte-identical output for the same input in two rules', async () => {
    const rule =
      '{margin:1px 2px 3px 4px;margin-inline-start:0;margin-left:5px;margin-right:5px}';
    const result = await postcss([plugin(modern)]).process(`a${rule}b${rule}`, {
      from: undefined,
    });
    const [first, second] = result.css.split(/[ab]\{/v).slice(1);
    assert.equal(first, second);
  });
});

describe('values that stay as written', () => {
  test(
    'keeps a value the later declaration only supplements with newer syntax, because the earlier one is its fallback',
    passthroughCSS(
      'a{margin:1px 2px 3px 4px;margin-inline-start:0;margin-top:1dvh}',
      older
    )
  );

  test(
    'keeps a value a later declaration of lower importance cannot override',
    passthroughCSS(
      'a{margin:1px 2px 3px 4px!important;margin-inline-start:0;margin-left:2px;margin-right:2px}',
      modern
    )
  );

  test(
    'keeps a shorthand with a unit some target cannot parse, because dropping the value could make it valid there',
    passthroughCSS(
      'a{margin:1cap 2px 3px 4px;margin-inline-start:0;margin-top:3px;margin-bottom:3px}',
      older
    )
  );

  test(
    'keeps a shorthand that follows a later declaration holding var(), which is no static override',
    passthroughCSS(
      'a{margin:1px 2px 3px 4px;margin-inline-start:0;margin-top:var(--x)}',
      modern
    )
  );

  test(
    'keeps a shorthand that holds var(), whose tokens are unknown',
    passthroughCSS(
      'a{margin:var(--a) 2px 3px 4px;margin-inline-start:0;margin-top:5px}',
      modern
    )
  );

  test(
    'keeps a shorthand that holds env() because it may stand for several tokens',
    passthroughCSS(
      'a{margin:env(a) env(a);margin-inline-start:0;margin-top:5px}',
      modern
    )
  );

  test(
    'keeps the original when the rewrite would not be shorter',
    passthroughCSS(
      'a{margin:1px 2px 3px 4px;margin-inline-start:0;margin-top:5px}',
      modern
    )
  );

  test(
    'keeps a value that a later declaration with a style hack overrides, because the hack targets one browser',
    passthroughCSS(
      'a{margin:1px 2px 3px 4px;margin-inline-start:0;margin-top:3px\\9}',
      modern
    )
  );
});

/**
 * @param {number} count
 * @return {boolean[][]} every choice of free slots
 */
function everyMask(count) {
  return count === 0
    ? [[]]
    : everyMask(count - 1).flatMap((rest) => [
        [...rest, false],
        [...rest, true],
      ]);
}

/**
 * The search as it was first written, which tried the opposite slot's value
 * twice: the earliest assignment of the shortest length wins.
 *
 * @param {string[]} values
 * @param {boolean[]} free
 * @param {(value: string[]) => string} minify
 * @return {string | undefined}
 */
function exhaustive(values, free, minify) {
  const freeSlots = [...values.keys()].filter((slot) => free[slot]);
  const fixed = [...values.keys()].filter((slot) => !free[slot]);
  if (freeSlots.length === 0 || fixed.length === 0) return undefined;
  let best = minify(values);
  let improved = false;
  const trial = [...values];
  const assign = (/** @type {number} */ position) => {
    if (position === freeSlots.length) {
      const candidate = minify(trial);
      if (candidate.length < best.length) {
        best = candidate;
        improved = true;
      }
      return;
    }
    const slot = freeSlots[position];
    const opposite = (slot + values.length / 2) % values.length;
    for (const source of [
      ...(fixed.includes(opposite) ? [opposite] : []),
      ...fixed,
    ]) {
      trial[slot] = values[source];
      assign(position + 1);
    }
  };
  assign(0);
  return improved ? best : undefined;
}

describe('shortest value for the slots a later declaration overrides', () => {
  const pool = ['0', '10px', '1px', '2px'];

  /**
   * @param {number} count
   * @return {string[][]} every assignment of the pool to that many slots
   */
  function everyAssignment(count) {
    return count === 0
      ? [[]]
      : everyAssignment(count - 1).flatMap((rest) =>
          pool.map((value) => [...rest, value])
        );
  }

  for (const [name, minify, count] of /** @type {const} */ ([
    ['four sides', minifyTrbl, 4],
    ['a start and an end', minifyPair, 2],
  ])) {
    test(`picks the same value as trying every assignment for ${name}`, () => {
      for (const values of everyAssignment(count)) {
        for (const free of everyMask(count)) {
          assert.equal(
            shortestWithFreeSlots(values, free, minify),
            exhaustive(values, free, minify),
            `${values.join(' ')} free ${free.join()}`
          );
        }
      }
    });
  }

  test('minifies each distinct assignment once, as equal values give equal results', () => {
    let calls = 0;
    shortestWithFreeSlots(
      ['1px', '2px', '1px', '2px'],
      [false, false, true, true],
      (value) => {
        calls++;
        return minifyTrbl(value);
      }
    );
    // The original, plus two values for each of two slots.
    assert.equal(calls, 5);
  });

  test('stops before searching when the shorthand is already one token', () => {
    let calls = 0;
    const result = shortestWithFreeSlots(
      ['1px', '1px', '1px', '1px'],
      [false, true, true, true],
      (value) => {
        calls++;
        return minifyTrbl(value);
      }
    );
    assert.deepEqual([result, calls], [undefined, 1]);
  });
});
