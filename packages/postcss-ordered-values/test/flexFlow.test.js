import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Flex-flow order', () => {
  test(
    'should order flex-flow',
    processCSS('h1{flex-flow: wrap column}', 'h1{flex-flow: column wrap}')
  );

  test(
    'should order flex-flow (uppercase property and value)',
    processCSS('h1{FLEX-FLOW: WRAP COLUMN}', 'h1{FLEX-FLOW: COLUMN WRAP}')
  );

  test(
    'should match escaped flex-flow keywords by decoded value',
    processCSS('h1{flex-flow:wrap \\63 olumn}', 'h1{flex-flow:\\63 olumn wrap}')
  );

  test(
    'should pass through unknown flex-flow functions instead of dropping them',
    passthroughCSS('h1{flex-flow: wrap foo(column)}')
  );

  test(
    'should pass through duplicate flex-flow keywords',
    passthroughCSS(
      'h1{flex-flow:row row wrap;flex-flow:nowrap wrap;flex-flow:column column-reverse}'
    )
  );

  test(
    'should order flex-flow #1',
    processCSS(
      'h1{flex-flow: row-reverse wrap-reverse}',
      'h1{flex-flow: row-reverse wrap-reverse}'
    )
  );
});

describe('Skip', () => {
  test(
    'should skip flex-flow:inherit',
    passthroughCSS('h1{flex-flow:inherit}')
  );

  test('should skip flex-flow:unset', passthroughCSS('h1{flex-flow: unset}'));

  test('should skip flex: 1 0 auto', passthroughCSS('h1{flex: 1 0 auto;}'));

  test('should skip flex: 0 1 auto', passthroughCSS('h1{flex: 0 1 auto;}'));
});

test('does not reuse stale raw declaration values after a mutation', async () => {
  const mutate = {
    postcssPlugin: 'mutate-value',
    OnceExit(root) {
      root.walkDecls('flex-flow', (decl) => {
        decl.value = 'wrap column';
      });
    },
  };
  const result = await postcss([mutate, plugin()]).process(
    'a{flex-flow:column wrap}',
    { from: undefined }
  );
  assert.strictEqual(result.css, 'a{flex-flow:column wrap}');
});

test(
  'should pass through important comments (flex-flow)',
  passthroughCSS('flex-flow: row-reverse /*!wow*/ wrap-reverse')
);

describe('Pass through', () => {
  test(
    'should abort ordering when a var is detected (flex-flow)',
    passthroughCSS('flex-flow: wrap var(--column)')
  );

  test(
    'should abort ordering when a var is detected (flex-flow) (uppercase "var")',
    passthroughCSS('flex-flow: wrap VAR(--column)')
  );
});
