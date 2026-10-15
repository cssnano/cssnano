import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertScaling } from './scalingHelper.js';

test('folds many independent eligible positions without pairwise scans', () => {
  assertScaling(
    [1_000, 2_000, 4_000, 8_000],
    (count) => {
      const selectors = [];
      const expected = [];
      for (let index = 0; index < count; index++) {
        selectors.push(`.prefix-${index} .a .suffix-${index}`);
        selectors.push(`.prefix-${index} .b .suffix-${index}`);
        expected.push(`.prefix-${index} :is(.a,.b) .suffix-${index}`);
      }
      return {
        input: selectors.join(','),
        expected: expected.join(','),
        sort: false,
        convertToIs: true,
      };
    },
    { label: 'fold' }
  );
});

test('mostly-unique widths have bounded doubling ratios', () => {
  assertScaling(
    [2_000, 4_000, 8_000, 16_000],
    (count) => {
      const input = Array.from(
        { length: count },
        (_, index) => `.item-${index}:not(.disabled-${index})`
      ).join(',');
      return {
        input,
        expected: input,
        sort: false,
        convertToIs: false,
      };
    },
    { label: 'mostly-unique' }
  );
});

test('normalizes wide ::part() argument lists in linear time', () => {
  assertScaling([1_000, 2_000, 4_000], (count) => {
    const items = Array.from({ length: count }, (_, i) => `part-${i}`);
    return {
      input: `::part( ${items.join('   ')} )`,
      validate(output) {
        assert.ok(output.startsWith('::part(part-0 part-1 '));
      },
      sort: false,
      convertToIs: false,
    };
  });
});

test('normalizes wide :lang() argument lists in linear time', () => {
  assertScaling([1_000, 2_000, 4_000], (count) => {
    const items = Array.from({ length: count }, (_, i) => ` "lang-${i}" `);
    return {
      input: `:lang(${items.join(',')})`,
      validate(output) {
        assert.ok(output.startsWith(':lang(lang-0,lang-1,'));
      },
      sort: false,
      convertToIs: false,
    };
  });
});

test('deduplicates wide selector lists with functions in linear time', () => {
  assertScaling([1_000, 2_000, 4_000], (count) => {
    const items = Array.from({ length: count }, (_, i) => `:is(.item-${i})`);
    const input = items.join(',');
    return {
      input,
      expected: input,
      sort: false,
      convertToIs: false,
    };
  });
});

test('deduplicates wide inner selector lists with functions in linear time', () => {
  assertScaling([1_000, 2_000, 4_000], (count) => {
    const items = Array.from({ length: count }, (_, i) => `:not(.item-${i})`);
    const input = `:is(${items.join(',')})`;
    return {
      input,
      expected: input,
      sort: false,
      convertToIs: false,
    };
  });
});

test('normalizes functional pseudo arguments in a single pass without multi-pass trivia rescans', () => {
  assertScaling([500, 1_000, 2_000], (count) => {
    const repeated = `:not(${Array.from(
      { length: count },
      (_, i) => `div /* ${i} */ > /* ${i} */ .item-${i}`
    ).join(',')})`;
    return {
      input: repeated,
      validate(output) {
        assert.ok(output.startsWith(':not('));
      },
      sort: false,
      convertToIs: false,
    };
  });
});
