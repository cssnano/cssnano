import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { sameContainer } from '../../../../../src/passes/merge/lib/rules/sameContainer.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { repositoryFile } from '../../../../../../../util/testHelpers.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import { ruleRecordOf, blockRecordOf } from './liveRecords.js';

const textTable = new TextTable();

/**
 * Builds the block records of `root`.
 *
 * @param {import('postcss').Root} root
 * @return {MergeState}
 */
function recordsOf(root) {
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  return state;
}

/**
 * Parses `css` and returns the blocks that hold the two rules found by
 * following each child-index path from the root.
 *
 * @param {string} css
 * @param {number[]} firstPath
 * @param {number[]} secondPath
 */
async function blockPair(css, firstPath, secondPath) {
  const { root } = await postcss().process(css, {
    from: repositoryFile,
    hideNothingWarning: true,
  });
  const state = recordsOf(root);
  const resolve = (path) => {
    let node = root;
    for (const index of path) {
      node = node.nodes[index];
    }
    return node;
  };
  return [
    ruleRecordOf(state.records, resolve(firstPath)).slot.block,
    ruleRecordOf(state.records, resolve(secondPath)).slot.block,
  ];
}

const nestedSupports = (outerFirst, outerSecond, firstQuery, secondQuery) => `
        ${outerFirst} {
            @supports(pointer: ${firstQuery}) {
                h1 {}
            }
        }
        ${outerSecond} {
            @supports(pointer: ${secondQuery}) {
                h2 {}
            }
        }
    `;

test('sameContainer holds for the blocks of sibling rules', async () => {
  const [first, second] = await blockPair('h1 {} h2 {}', [0], [1]);

  assert.strictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer holds for two missing blocks', () => {
  assert.strictEqual(sameContainer(null, undefined, textTable), true);
});

test('sameContainer does not hold when only one block is missing', async () => {
  const [first] = await blockPair('h1 {}', [0], [0]);

  assert.strictEqual(sameContainer(first, null, textTable), false);
});

test('sameContainer holds for siblings inside one @media block', async () => {
  const [first, second] = await blockPair(
    '@media screen{h1 {} h2 {}}',
    [0, 0],
    [0, 1]
  );
  assert.strictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer holds for rules in equal @media blocks', async () => {
  const [first, second] = await blockPair(
    '@media screen{h1 {}} @media screen{h2 {}}',
    [0, 0],
    [1, 0]
  );
  assert.strictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer compares at-rule names case-insensitively', async () => {
  const [first, second] = await blockPair(
    '@media screen{h1 {}} @MEDIA screen{h2 {}}',
    [0, 0],
    [1, 0]
  );
  assert.strictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer holds for rules in equal nested at-rule blocks', async () => {
  const [first, second] = await blockPair(
    nestedSupports('@media screen', '@media screen', 'course', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );
  assert.strictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold when nested @supports conditions differ', async () => {
  const [first, second] = await blockPair(
    nestedSupports('@media screen', '@media screen', 'fine', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );
  assert.notStrictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold when outer @media queries differ', async () => {
  const [first, second] = await blockPair(
    nestedSupports('@media print', '@media screen', 'course', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );
  assert.notStrictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold when only one side is inside an outer @media block', async () => {
  const [first, second] = await blockPair(
    `
        @supports(pointer: course) {
            h1 {}
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
    [0, 0],
    [1, 0, 0]
  );
  assert.notStrictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold when only one side is inside a nested @supports block', async () => {
  const [first, second] = await blockPair(
    `
        @media screen {
            h1 {}
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
    [0, 0],
    [1, 0, 0]
  );
  assert.notStrictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold for two anonymous @layer blocks', async () => {
  const [first, second] = await blockPair(
    '@layer { h1 {} } @layer { h2 {} }',
    [0, 0],
    [1, 0]
  );
  assert.notStrictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold for rules nested in parent rules with different selectors', async () => {
  const [first, second] = await blockPair(
    '.card { h1 {} } .hero { h2 {} }',
    [0, 0],
    [1, 0]
  );
  assert.notStrictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer holds for rules nested in parent rules with identical selectors', async () => {
  const [first, second] = await blockPair(
    '.card { h1 {} } .card { h2 {} }',
    [0, 0],
    [1, 0]
  );
  assert.strictEqual(sameContainer(first, second, textTable), true);
});

test('sameContainer does not hold for anonymous @layer blocks whose params are only comments', () => {
  const layer1 = postcss.atRule({ name: 'layer', params: '/*! important */' });
  const layer2 = postcss.atRule({ name: 'layer', params: '/*! important */' });
  const h1 = postcss.rule({ selector: 'h1' });
  const h2 = postcss.rule({ selector: 'h2' });
  layer1.append(h1);
  layer2.append(h2);
  const root = postcss.root();
  root.append(layer1, layer2);
  const state = recordsOf(root);
  assert.notStrictEqual(
    sameContainer(
      ruleRecordOf(state.records, h1).slot.block,
      ruleRecordOf(state.records, h2).slot.block,
      textTable
    ),
    true
  );
});

test('sameContainer holds for named @layer blocks with identical comments and name', () => {
  const layer1 = postcss.atRule({
    name: 'layer',
    params: '/* comment */ foo',
  });
  const layer2 = postcss.atRule({
    name: 'layer',
    params: '/* comment */ foo',
  });
  const h1 = postcss.rule({ selector: 'h1' });
  const h2 = postcss.rule({ selector: 'h2' });
  layer1.append(h1);
  layer2.append(h2);
  const root = postcss.root();
  root.append(layer1, layer2);
  const state = recordsOf(root);
  assert.strictEqual(
    sameContainer(
      ruleRecordOf(state.records, h1).slot.block,
      ruleRecordOf(state.records, h2).slot.block,
      textTable
    ),
    true
  );
});

test('sameContainer should hold for equal conditional blocks that are different nodes', async () => {
  const { root } = await postcss().process(
    '@media print{a{}}@media print{b{}}',
    { from: repositoryFile }
  );
  const state = recordsOf(root);
  assert.strictEqual(
    sameContainer(
      blockRecordOf(state.records, root.nodes[0]),
      blockRecordOf(state.records, root.nodes[1]),
      textTable
    ),
    true
  );
});

test('sameContainer should not hold for blocks with different conditions', async () => {
  const { root } = await postcss().process(
    '@media print{a{}}@media screen{b{}}',
    { from: repositoryFile }
  );
  const state = recordsOf(root);
  assert.strictEqual(
    sameContainer(
      blockRecordOf(state.records, root.nodes[0]),
      blockRecordOf(state.records, root.nodes[1]),
      textTable
    ),
    false
  );
});

test('sameContainer should not hold when only one side is the stylesheet root', async () => {
  const { root } = await postcss().process('@media print{a{}}', {
    from: repositoryFile,
  });
  const state = recordsOf(root);
  assert.strictEqual(
    sameContainer(
      state.records.root,
      blockRecordOf(state.records, root.nodes[0]),
      textTable
    ),
    false
  );
});

test('sameContainer should hold for two undefined containers', () => {
  assert.strictEqual(sameContainer(undefined, undefined, textTable), true);
});

test('sameContainer should not hold when the outer blocks differ and the inner ones match', async () => {
  const { root } = await postcss().process(
    '@media print{@supports (x:y){a{}}}@media screen{@supports (x:y){b{}}}',
    { from: repositoryFile }
  );
  const state = recordsOf(root);
  const first = blockRecordOf(state.records, root.nodes[0].nodes[0]);
  const second = blockRecordOf(state.records, root.nodes[1].nodes[0]);
  assert.strictEqual(sameContainer(first, second, textTable), false);
});

test('sameContainer does not fold the Kelvin sign in at-rule names, because CSS matches names ASCII-case-insensitively', () => {
  const kelvin = postcss.atRule({ name: 'Keyframes', params: 'a' });
  const ascii = postcss.atRule({ name: 'keyframes', params: 'a' });
  kelvin.append(postcss.rule({ selector: 'h1' }));
  ascii.append(postcss.rule({ selector: 'h2' }));
  const root = postcss.root();
  root.append(kelvin, ascii);
  const state = recordsOf(root);
  assert.strictEqual(
    sameContainer(
      blockRecordOf(state.records, kelvin),
      blockRecordOf(state.records, ascii),
      textTable
    ),
    false
  );
});
