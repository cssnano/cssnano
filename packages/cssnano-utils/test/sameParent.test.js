import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import sameParent, { sameContainer } from '../src/sameParent.js';

test('should calculate same parent', async () => {
  const result = await postcss().process('h1 {} h2 {}', {
    from: undefined,
    hideNothingWarning: true,
  });
  const h1 = result.root.nodes[0];
  const h2 = result.root.nodes[1];

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (detached nodes)', async () => {
  const result = await postcss().process('h1 {} h2 {}', {
    from: undefined,
    hideNothingWarning: true,
  });
  const h1 = result.root.nodes[0];
  const h2 = result.root.nodes[1];

  h1.remove();
  h2.remove();

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (at rules)', async () => {
  const result = await postcss().process('@media screen{h1 {} h2 {}}', {
    from: undefined,
    hideNothingWarning: true,
  });
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[0].nodes[1];

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (multiple at rules)', async () => {
  const result = await postcss().process(
    '@media screen{h1 {}} @media screen{h2 {}}',
    {
      from: undefined,
      hideNothingWarning: true,
    }
  );
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0];

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (multiple at rules (uppercase))', async () => {
  const result = await postcss().process(
    '@media screen{h1 {}} @MEDIA screen{h2 {}}',
    {
      from: undefined,
      hideNothingWarning: true,
    }
  );
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0];

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent (nested at rules)', async () => {
  const result = await postcss().process(
    `
        @media screen {
            @supports(pointer: course) {
                h1 {}
            }
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
    { from: undefined, hideNothingWarning: true }
  );
  const h1 = result.root.nodes[0].nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0].nodes[0];

  assert.strictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules)', async () => {
  const result = await postcss().process(
    `
        @media screen {
            @supports(pointer: fine) {
                h1 {}
            }
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
    { from: undefined, hideNothingWarning: true }
  );
  const h1 = result.root.nodes[0].nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0].nodes[0];

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules) (2)', async () => {
  const result = await postcss().process(
    `
        @media print {
            @supports(pointer: course) {
                h1 {}
            }
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
    { from: undefined, hideNothingWarning: true }
  );
  const h1 = result.root.nodes[0].nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0].nodes[0];

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules) (3)', async () => {
  const result = await postcss().process(
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
    { from: undefined, hideNothingWarning: true }
  );
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0].nodes[0];

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent (nested at rules) (4)', async () => {
  const result = await postcss().process(
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
    { from: undefined, hideNothingWarning: true }
  );
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0].nodes[0];

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent for anonymous @layer rules', async () => {
  const result = await postcss().process('@layer { h1 {} } @layer { h2 {} }', {
    from: undefined,
    hideNothingWarning: true,
  });
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0];

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate not same parent for rules nested in different parent rules', async () => {
  const result = await postcss().process('.card { h1 {} } .hero { h2 {} }', {
    from: undefined,
    hideNothingWarning: true,
  });
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0];

  assert.notStrictEqual(sameParent(h1, h2), true);
});

test('should calculate same parent for rules nested in identical selector parent rules', async () => {
  const result = await postcss().process('.card { h1 {} } .card { h2 {} }', {
    from: undefined,
    hideNothingWarning: true,
  });
  const h1 = result.root.nodes[0].nodes[0];
  const h2 = result.root.nodes[1].nodes[0];

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
