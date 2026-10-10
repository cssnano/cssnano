import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { sameContainer } from '../src/lib/sameContainer.js';

/**
 * Parses `css` and returns the two nodes found by following each child-index
 * path from the root.
 *
 * @param {string} css
 * @param {number[]} firstPath
 * @param {number[]} secondPath
 */
async function parseNodePair(css, firstPath, secondPath) {
  const { root } = await postcss().process(css, {
    from: undefined,
    hideNothingWarning: true,
  });
  const resolve = (path) => {
    let node = root;
    for (const index of path) {
      node = node.nodes[index];
    }
    return node;
  };
  return [resolve(firstPath), resolve(secondPath)];
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

test('sameContainer holds for the parents of sibling rules', async () => {
  const [h1, h2] = await parseNodePair('h1 {} h2 {}', [0], [1]);

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer holds for the missing parents of two detached rules', async () => {
  const [h1, h2] = await parseNodePair('h1 {} h2 {}', [0], [1]);

  h1.remove();
  h2.remove();

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer holds for siblings inside one @media block', async () => {
  const [h1, h2] = await parseNodePair(
    '@media screen{h1 {} h2 {}}',
    [0, 0],
    [0, 1]
  );

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer holds for rules in equal @media blocks', async () => {
  const [h1, h2] = await parseNodePair(
    '@media screen{h1 {}} @media screen{h2 {}}',
    [0, 0],
    [1, 0]
  );

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer compares at-rule names case-insensitively', async () => {
  const [h1, h2] = await parseNodePair(
    '@media screen{h1 {}} @MEDIA screen{h2 {}}',
    [0, 0],
    [1, 0]
  );

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer holds for rules in equal nested at-rule blocks', async () => {
  const [h1, h2] = await parseNodePair(
    nestedSupports('@media screen', '@media screen', 'course', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold when nested @supports conditions differ', async () => {
  const [h1, h2] = await parseNodePair(
    nestedSupports('@media screen', '@media screen', 'fine', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold when outer @media queries differ', async () => {
  const [h1, h2] = await parseNodePair(
    nestedSupports('@media print', '@media screen', 'course', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold when only one side is inside an outer @media block', async () => {
  const [h1, h2] = await parseNodePair(
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

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold when only one side is inside a nested @supports block', async () => {
  const [h1, h2] = await parseNodePair(
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

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold for two anonymous @layer blocks', async () => {
  const [h1, h2] = await parseNodePair(
    '@layer { h1 {} } @layer { h2 {} }',
    [0, 0],
    [1, 0]
  );

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold for rules nested in parent rules with different selectors', async () => {
  const [h1, h2] = await parseNodePair(
    '.card { h1 {} } .hero { h2 {} }',
    [0, 0],
    [1, 0]
  );

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer holds for rules nested in parent rules with identical selectors', async () => {
  const [h1, h2] = await parseNodePair(
    '.card { h1 {} } .card { h2 {} }',
    [0, 0],
    [1, 0]
  );

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer does not hold for anonymous @layer blocks whose params are only comments', () => {
  const layer1 = postcss.atRule({ name: 'layer', params: '/*! important */' });
  const layer2 = postcss.atRule({ name: 'layer', params: '/*! important */' });
  const h1 = postcss.rule({ selector: 'h1' });
  const h2 = postcss.rule({ selector: 'h2' });
  layer1.append(h1);
  layer2.append(h2);

  assert.notStrictEqual(sameContainer(h1.parent, h2.parent), true);
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

  assert.strictEqual(sameContainer(h1.parent, h2.parent), true);
});

test('sameContainer should hold for equal conditional blocks that are different nodes', () => {
  const { root } = postcss().process('@media print{a{}}@media print{b{}}', {
    from: undefined,
  });
  assert.strictEqual(sameContainer(root.nodes[0], root.nodes[1]), true);
});

test('sameContainer should not hold for blocks with different conditions', () => {
  const { root } = postcss().process('@media print{a{}}@media screen{b{}}', {
    from: undefined,
  });
  assert.strictEqual(sameContainer(root.nodes[0], root.nodes[1]), false);
});

test('sameContainer should not hold when only one side is the stylesheet root', () => {
  const { root } = postcss().process('@media print{a{}}', { from: undefined });
  assert.strictEqual(sameContainer(root, root.nodes[0]), false);
});

test('sameContainer should hold for two undefined containers', () => {
  assert.strictEqual(sameContainer(undefined, undefined), true);
});

test('sameContainer should not hold when the outer blocks differ and the inner ones match', () => {
  const { root } = postcss().process(
    '@media print{@supports (x:y){a{}}}@media screen{@supports (x:y){b{}}}',
    { from: undefined }
  );
  const first = root.nodes[0].nodes[0];
  const second = root.nodes[1].nodes[0];
  assert.strictEqual(sameContainer(first, second), false);
});

test('sameContainer does not fold the Kelvin sign in at-rule names, because CSS matches names ASCII-case-insensitively', () => {
  const kelvin = postcss.atRule({ name: 'Keyframes', params: 'a' });
  const ascii = postcss.atRule({ name: 'keyframes', params: 'a' });
  assert.strictEqual(sameContainer(kelvin, ascii), false);
});
