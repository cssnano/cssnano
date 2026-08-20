'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const discardEmptyPlugin = require('../src/index.js');

const { passthroughCSS, processCSS, processor } =
  processCSSFactory(discardEmptyPlugin);

const removalFixture = 'h1{}.hot{}.a.b{}{}@media screen, print{h1,h2{}}';
const removedSelectors = ['h1', '.hot', '.a.b', '', 'h1,h2'];
const removalCount = 6;

test('should remove empty @ rules', processCSS('@font-face;', ''));

test('should remove empty @ rules (2)', processCSS('@font-face {}', ''));

test(
  'should not mangle @ rules with decls',
  passthroughCSS('@font-face {font-family: Helvetica}')
);

test(
  'should not mangle @ rules with parameters',
  passthroughCSS('@charset "utf-8";')
);

test('should remove empty rules', processCSS('h1{}h2{}h4{}h5,h6{}', ''));

test('should remove empty declarations', processCSS('h1{color:}', ''));

test('should remove null selectors', processCSS('{color:blue}', ''));

test(
  'should remove null selectors in media queries',
  processCSS('@media screen, print {{}}', '')
);

test(
  'should remove empty media queries',
  processCSS('@media screen, print {h1,h2{}}', '')
);

test(
  'should not be responsible for removing comments',
  passthroughCSS('h1{/*comment*/}')
);

test(
  'should preserve empty custom properties',
  passthroughCSS('*{--tw-shadow:; --something-else: ;}')
);

test(
  'should preserve empty layers',
  passthroughCSS(`@layer a {}
@layer b {}

@layer b {
  foo {
    color: red;
  }
}

@layer a {
  bar {
    color: green;
  }
  }`)
);

test(
  'should discard empty layers after a non-empty layer with the same name',
  processCSS(
    '@layer components{.a{display:flex}}@layer components{}',
    '@layer components{.a{display:flex}}'
  )
);

test(
  'should discard empty layers after a non-empty layer with an equivalent path',
  processCSS(
    '@layer a{@layer b{.a{display:flex}}}@layer a.b{}',
    '@layer a{@layer b{.a{display:flex}}}'
  )
);

test('should discard empty rules and at-rules', processCSS(removalFixture, ''));

test('should identify removal messages by plugin', async () => {
  const result = await processor(removalFixture);

  assert.deepStrictEqual(
    result.messages.map(({ plugin }) => plugin),
    Array.from({ length: removalCount }, () => 'postcss-discard-empty')
  );
});

test('should classify discarded nodes as removal messages', async () => {
  const result = await processor(removalFixture);

  assert.deepStrictEqual(
    result.messages.map(({ type }) => type),
    Array.from({ length: removalCount }, () => 'removal')
  );
});

test('should report selectors for discarded rules', async () => {
  const result = await processor(removalFixture);

  assert.deepStrictEqual(
    result.messages
      .map(({ node }) => node.selector)
      .filter((selector) => selector !== undefined),
    removedSelectors
  );
});

test('should not report unexpected selectors for discarded rules', async () => {
  const result = await processor(removalFixture);

  assert.ok(
    result.messages
      .map(({ node }) => node.selector)
      .filter((selector) => selector !== undefined)
      .every((selector) => removedSelectors.includes(selector))
  );
});

test(
  'should use the postcss plugin api',
  usePostCSSPlugin(discardEmptyPlugin())
);
