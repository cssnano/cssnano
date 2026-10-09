import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import sameParent, { sameContainer } from '../src/sameParent.js';

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

test('should calculate same parent', async () => {
  const [h1, h2] = await parseNodePair('h1 {} h2 {}', [0], [1]);

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (detached nodes)', async () => {
  const [h1, h2] = await parseNodePair('h1 {} h2 {}', [0], [1]);

  h1.remove();
  h2.remove();

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (at rules)', async () => {
  const [h1, h2] = await parseNodePair(
    '@media screen{h1 {} h2 {}}',
    [0, 0],
    [0, 1]
  );

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (multiple at rules)', async () => {
  const [h1, h2] = await parseNodePair(
    '@media screen{h1 {}} @media screen{h2 {}}',
    [0, 0],
    [1, 0]
  );

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (multiple at rules (uppercase))', async () => {
  const [h1, h2] = await parseNodePair(
    '@media screen{h1 {}} @MEDIA screen{h2 {}}',
    [0, 0],
    [1, 0]
  );

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (nested at rules)', async () => {
  const [h1, h2] = await parseNodePair(
    nestedSupports('@media screen', '@media screen', 'course', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules)', async () => {
  const [h1, h2] = await parseNodePair(
    nestedSupports('@media screen', '@media screen', 'fine', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules) (2)', async () => {
  const [h1, h2] = await parseNodePair(
    nestedSupports('@media print', '@media screen', 'course', 'course'),
    [0, 0, 0],
    [1, 0, 0]
  );

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules) (3)', async () => {
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

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules) (4)', async () => {
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

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent for anonymous @layer rules', async () => {
  const [h1, h2] = await parseNodePair(
    '@layer { h1 {} } @layer { h2 {} }',
    [0, 0],
    [1, 0]
  );

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent for rules nested in different parent rules', async () => {
  const [h1, h2] = await parseNodePair(
    '.card { h1 {} } .hero { h2 {} }',
    [0, 0],
    [1, 0]
  );

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent for rules nested in identical selector parent rules', async () => {
  const [h1, h2] = await parseNodePair(
    '.card { h1 {} } .card { h2 {} }',
    [0, 0],
    [1, 0]
  );

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent for anonymous @layer rules with comments in params', () => {
  const layer1 = postcss.atRule({ name: 'layer', params: '/*! important */' });
  const layer2 = postcss.atRule({ name: 'layer', params: '/*! important */' });
  const h1 = postcss.rule({ selector: 'h1' });
  const h2 = postcss.rule({ selector: 'h2' });
  layer1.append(h1);
  layer2.append(h2);

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent for named @layer rules with identical comments and name', () => {
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

  assert.strictEqual(sameParent(h1, h2), true);
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
