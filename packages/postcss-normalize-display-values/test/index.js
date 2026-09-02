import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, processor, passthroughCSS } = processCSSFactory(plugin);

describe('Pass', () => {
  test(
    'should pass through "block ruby"',
    passthroughCSS('display:block ruby;')
  );

  test('should pass through single values', passthroughCSS('display:block;'));

  for (const value of ['list-item', 'none', 'contents']) {
    test(
      `should pass through a single ${value} value`,
      passthroughCSS(`display:${value};`)
    );
  }
});

/* source: https://www.w3.org/TR/css-display-3/#the-display-properties */
const fixtures = [
  { input: 'block flow', minified: 'block' },
  { input: 'block flow-root', minified: 'flow-root' },
  { input: 'inline flow', minified: 'inline' },
  { input: 'inline flow-root', minified: 'inline-block' },
  { input: 'run-in flow', minified: 'run-in' },
  { input: 'list-item block flow', minified: 'list-item' },
  { input: 'block list-item', minified: 'list-item' },
  { input: 'list-item block', minified: 'list-item' },
  { input: 'flow list-item', minified: 'list-item' },
  { input: 'list-item flow', minified: 'list-item' },
  { input: 'inline flow list-item', minified: 'inline list-item' },
  { input: 'inline list-item', minified: 'inline list-item' },
  { input: 'list-item inline', minified: 'inline list-item' },
  { input: 'block flex', minified: 'flex' },
  { input: 'inline flex', minified: 'inline-flex' },
  { input: 'block grid', minified: 'grid' },
  { input: 'inline grid', minified: 'inline-grid' },
  { input: 'inline ruby', minified: 'ruby' },
  { input: 'block table', minified: 'table' },
  { input: 'inline table', minified: 'inline-table' },
];

for (const { input, minified } of fixtures) {
  test(
    `display: ${input} => display: ${minified}`,
    processCSS(`display:${input}`, `display:${minified}`)
  );
}

const permutations = [
  { input: 'flow block', minified: 'block' },
  { input: 'flow-root INLINE', minified: 'inline-block' },
  { input: 'FLEX block', minified: 'flex' },
  { input: 'FLEX inline', minified: 'inline-flex' },
  { input: 'grid \\69 nline', minified: 'inline-grid' },
  { input: 'list-item FLOW BLOCK', minified: 'list-item' },
  { input: 'list-item \\66 low INLINE', minified: 'inline list-item' },
];

for (const input of [
  'block flow list-item',
  'block list-item flow',
  'flow block list-item',
  'flow list-item block',
  'list-item block flow',
  'list-item flow block',
]) {
  test(
    `display: ${input} => display: list-item (all list-item permutations)`,
    processCSS(`display:${input}`, 'display:list-item')
  );
}

for (const { input, minified } of permutations) {
  test(
    `display: ${input} => display: ${minified} (permuted components)`,
    processCSS(`display:${input}`, `display:${minified}`)
  );
}

test(
  `display: block flow => display: block (uppercase property and values)`,
  processCSS(`DISPLAY:BLOCK FLOW`, `DISPLAY:block`)
);

test(`should pass through variables`, passthroughCSS(`display:var(--foo)`));

test(
  `should pass through variables #1`,
  passthroughCSS(`display:var(--foo) var(--bar)`)
);

for (const value of [
  'table-cell flow',
  'table-caption flow',
  'ruby-base flow',
  'ruby-text flow',
]) {
  test(
    `should pass through invalid internal display value: ${value}`,
    passthroughCSS(`display:${value}`)
  );
}

test(
  'should normalize matching escaped identifiers',
  processCSS('display:bl\\6f ck flow', 'display:block')
);

test('should not case-fold non-ASCII identifiers', () => {
  return Promise.all(
    ['blocK flow', 'bloc\\212A flow'].map(async (input) => {
      const result = await processor(`display:${input}`);
      assert.strictEqual(result.css, `display:${input}`);
    })
  );
});

test(
  'should treat comments as whitespace in a matching value',
  processCSS('display:block/**/flow-root', 'display:flow-root')
);

test('should pass through a comma', passthroughCSS('display:block,flow'));

for (const input of [
  'block inline',
  'flex grid',
  'block block',
  'flow flow',
  'list-item list-item',
  'block flow list-item extra',
  'none block',
  'contents inline',
  'flex list-item',
  'grid list-item',
  'ruby block',
]) {
  test(
    `should pass through invalid display value: ${input}`,
    passthroughCSS(`display:${input}`)
  );
}

test(
  'should normalize keywords separated by newlines and tabs',
  processCSS('display:block\n\tflow', 'display:block')
);

test(
  'should normalize keywords surrounded by comments',
  processCSS(
    'display:/* start */ block flow /* end */',
    'display:/* start */ block /* end */'
  )
);

test(
  'should pass through a whitespace-only value',
  passthroughCSS('display:   ')
);

test('should pass through a function or URL', async () => {
  const functionResult = await processor('display:var(--display)');
  assert.strictEqual(functionResult.css, 'display:var(--display)');

  const urlResult = await processor('display:url(foo)');
  assert.strictEqual(urlResult.css, 'display:url(foo)');
});

test('should pass through a string', passthroughCSS('display:block "flow"'));

test('should pass through a delimiter', passthroughCSS('display:block + flow'));

test('should pass through nested and unclosed blocks', async () => {
  const nested = postcss.decl({ prop: 'display', value: 'block [x] flow' });
  const nestedRoot = postcss.root({ nodes: [nested] });
  await postcss([plugin()]).process(nestedRoot, { from: undefined });
  assert.strictEqual(nested.value, 'block [x] flow');

  const unclosed = postcss.decl({ prop: 'display', value: 'block [x flow' });
  const unclosedRoot = postcss.root({ nodes: [unclosed] });
  await postcss([plugin()]).process(unclosedRoot, { from: undefined });
  assert.strictEqual(unclosed.value, 'block [x flow');
});

test('should synchronize raw values on cache hits', async () => {
  const first = postcss.decl({ prop: 'display', value: 'block flow' });
  first.raws.value = { raw: 'BLOCK FLOW', value: 'block flow' };
  const second = postcss.decl({ prop: 'display', value: 'block flow' });
  second.raws.value = { raw: 'BLOCK FLOW', value: 'block flow' };
  const root = postcss.root({ nodes: [first, second] });
  await postcss([plugin()]).process(root, { from: undefined });

  assert.deepStrictEqual(
    [first, second].map((decl) => ({
      raw: decl.raws.value.raw,
      value: decl.value,
    })),
    [
      { raw: 'block', value: 'block' },
      { raw: 'block', value: 'block' },
    ]
  );
});

test('should ignore stale raw values on cache misses and hits', async () => {
  const first = postcss.decl({ prop: 'display', value: 'block flow' });
  first.raws.value = { raw: 'inline flex', value: 'inline flex' };
  const second = postcss.decl({ prop: 'display', value: 'block flow' });
  second.raws.value = { raw: 'inline flex', value: 'inline flex' };
  const root = postcss.root({ nodes: [first, second] });
  await postcss([plugin()]).process(root, { from: undefined });

  assert.deepStrictEqual(
    [first, second].map((decl) => decl.value),
    ['block', 'block']
  );
});

test(
  'should preserve unmatched whitespace and raw spelling',
  passthroughCSS('display:  BLOCK\\+   FLOW  ')
);

test(`should pass through invalid syntax`, passthroughCSS(`display:`));

test(
  `should pass through not display property`,
  passthroughCSS(`something-display: block flow`)
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
