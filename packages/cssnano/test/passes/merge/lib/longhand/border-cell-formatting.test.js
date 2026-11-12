import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before any module below loads it.
const { counter } = await import('../../../../../../../util/countTokenize.js');
const { longstandingFeatures } =
  await import('../../../../../src/passes/merge/lib/longhand/syntaxFeatures.js');
const { createRunContext } =
  await import('../../../../../src/passes/ir/runContext.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } =
  await import('../../../../../src/pipeline/traversal.js');
const { TextTable } = await import('../../../../../src/values/textTable.js');
const { reduceBorder } =
  await import('../../../../../src/passes/merge/lib/longhand/decl/borderReducer.js');
const { minifyCells } =
  await import('../../../../../src/passes/merge/lib/longhand/decl/borderCells.js');
const { default: minifyWidthStyleColor } =
  await import('../../../../../src/passes/merge/lib/longhand/minifyWsc.js');
const { readBlock } = await import('./helpers/declarationItems.js');
const { RUN_END } =
  await import('../../../../../src/passes/merge/lib/longhand/blockDeclarations.js');
const { wholeText } =
  await import('../../../../../src/passes/merge/lib/longhand/componentRanges.js');

/**
 * Runs `reduce` and returns the text of each tokenize call it made, in order.
 * The counter records every call, so a text tokenized twice appears twice,
 * whatever earlier tests in the process tokenized.
 *
 * @param {() => void} reduce
 * @return {string[]} the texts `reduce` tokenized, sorted
 */
function tokenizedByReduce(reduce) {
  const texts = [];
  const record = counter.record;
  counter.record = (input) => {
    texts.push(input.css);
    record.call(counter, input);
  };
  try {
    reduce();
  } finally {
    counter.record = record;
  }
  return texts.toSorted();
}

const helpers = { result: { warn() {} } };

/**
 * Parses the stylesheet and gives each declaration value its token list
 * through the host walk's value stage, as the default preset does.
 *
 * @param {string} css
 * @return {{root: import('postcss').Root, table: InstanceType<typeof TextTable>}}
 */
function walkedStylesheet(css) {
  const root = postcss.parse(css);
  const table = new TextTable();
  const stage = { forProperty: () => (buffer) => buffer.tokens() };
  walkStylesheet([stage], root, helpers, new Map(), table);
  return { root, table };
}

suite('border candidates format the cells from the stored tokens', () => {
  test('border candidates tokenize only the new side components, each once', () => {
    const { root, table } = walkedStylesheet(
      'a{border-top:calc(1px) solid red;border-right:calc(1px) solid red;border-bottom:calc(1px) solid red;border-left:calc(1px) solid red}'
    );
    const list = readBlock(root.first, createRunContext(table)).list;
    const positions = [...list.chain].filter((p) => p !== RUN_END);
    const added = tokenizedByReduce(() =>
      reduceBorder(list, positions, false, longstandingFeatures)
    );
    // Each side component is tokenized once; the whole input values are not.
    assert.deepEqual(added, ['calc(1px)', 'red', 'solid']);
  });

  test('reset candidates tokenize no text when they format a side', () => {
    const { root, table } = walkedStylesheet(
      'a{border:calc(1px) solid red;border-top-width:2px}'
    );
    const list = readBlock(root.first, createRunContext(table)).list;
    const positions = [...list.chain].filter((p) => p !== RUN_END);
    const added = tokenizedByReduce(() =>
      reduceBorder(list, positions, false, longstandingFeatures)
    );
    assert.deepEqual(added, []);
  });
});

/**
 * The cells and components of one side, each cell a whole component.
 *
 * @param {string[]} values the width, style and color cells, '' for blank
 */
function sideOf(values) {
  const cellComponents = [];
  const cells = values.map((text, index) => {
    if (text === '') return '';
    cellComponents[index] = wholeText(text);
    return text;
  });
  return { cells, cellComponents };
}

suite('minifyCells formats a side as minifyWsc formats its joined text', () => {
  const widths = ['', '1px', 'THIN', 'medium', 'calc(1px)', 'red', 'var(--x)'];
  const styles = [
    '',
    'solid',
    'NONE',
    'medium',
    'calc(1px)',
    'red',
    'var(--x)',
  ];
  const colors = [
    '',
    'red',
    'currentcolor',
    'RGB(0 0 0)',
    'rgb(0 0 0)',
    'medium',
    'var(--x)',
    '#FFF',
  ];

  test('the cell formatter matches minifyWsc on every width, style and color triple', () => {
    const mismatches = [];
    for (const width of widths) {
      for (const style of styles) {
        for (const color of colors) {
          const { cells, cellComponents } = sideOf([width, style, color]);
          const formatted = minifyCells(cells, cellComponents, [0, 1, 2]);
          const expected = minifyWidthStyleColor(
            [width, style, color].join(' ')
          );
          if (formatted !== expected) mismatches.push([width, style, color]);
        }
      }
    }
    assert.deepEqual(mismatches, []);
  });

  test('a cell its slot does not classify as falls back to the joined text', () => {
    const { cells, cellComponents } = sideOf(['red', 'solid', '']);
    assert.equal(minifyCells(cells, cellComponents, [0, 1, 2]), 'solid red');
  });

  test('a cell with a function but no token range falls back to the joined text', () => {
    const cells = ['calc(1px)', 'solid', 'red'];
    const cellComponents = [];
    assert.equal(
      minifyCells(cells, cellComponents, [0, 1, 2]),
      'calc(1px) solid red'
    );
  });
});
