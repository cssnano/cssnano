import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { oneStagePlugin } from '../../../../util/testHelpers.js';
import calc from '../../src/plugins/postcss-calc/index.js';

const plugin = oneStagePlugin(calc);

/**
 * @param {string} css
 * @param {object} options
 * @returns {Promise<{text: string, plugin: string | undefined}[]>}
 */
async function warningsOf(css, options) {
  const result = await postcss([plugin(options)]).process(css, {
    from: undefined,
  });
  return result
    .warnings()
    .map((warning) => ({ text: warning.text, plugin: warning.plugin }));
}

test('warnWhenCannotResolve reports a value it cannot reduce, tagged with postcss-calc', async () => {
  assert.deepEqual(
    await warningsOf('a{width:calc(1px + var(--x))}', {
      warnWhenCannotResolve: true,
    }),
    [
      {
        text: 'Could not reduce expression: calc(1px + var(--x))',
        plugin: 'postcss-calc',
      },
    ]
  );
});

test('warnWhenCannotResolve reports each declaration with the same value, not only the first', async () => {
  const warnings = await warningsOf(
    'a{width:calc(1px + var(--x))}b{width:calc(1px + var(--x))}',
    { warnWhenCannotResolve: true }
  );
  assert.equal(warnings.length, 2);
});

test('a calc() that does not parse reports the parse error, tagged with postcss-calc', async () => {
  assert.deepEqual(await warningsOf('a{width:calc(10px * (1px + 1px))}', {}), [
    { text: 'Invalid CSS calculation type', plugin: 'postcss-calc' },
  ]);
});
