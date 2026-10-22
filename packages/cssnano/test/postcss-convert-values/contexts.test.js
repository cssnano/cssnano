import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  oneStagePlugin,
  repositoryFile,
} from '../../../../util/testHelpers.js';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';

const plugin = oneStagePlugin(convertValues);

/**
 * @param {string} css
 * @returns {Promise<string>}
 */
async function convert(css) {
  const result = await postcss([plugin()]).process(css, {
    from: repositoryFile,
  });
  return result.css;
}

describe('convertValues by declaration context', () => {
  test('keeps an opacity above 1 inside @keyframes, where it is not clamped', async () => {
    assert.equal(
      await convert('@keyframes k{from{opacity:1.2}}'),
      '@keyframes k{from{opacity:1.2}}'
    );
  });

  test('keeps an opacity above 1 inside @-webkit-keyframes, where it is not clamped', async () => {
    assert.equal(
      await convert('@-webkit-keyframes k{from{opacity:1.2}}'),
      '@-webkit-keyframes k{from{opacity:1.2}}'
    );
  });

  test('keeps the 0% of stroke-width inside @keyframes, a property whose zero percentage the plugin keeps', async () => {
    assert.equal(
      await convert('@keyframes k{from{stroke-width:0%}}'),
      '@keyframes k{from{stroke-width:0%}}'
    );
  });

  test('clamps an opacity above 1 outside every context', async () => {
    assert.equal(await convert('a{opacity:1.2}'), 'a{opacity:1}');
  });

  test('keeps the 0% of an @property initial-value when its syntax allows percentages', async () => {
    assert.equal(
      await convert(
        '@property --a{syntax:"<length-percentage>";initial-value:0%}'
      ),
      '@property --a{syntax:"<length-percentage>";initial-value:0%}'
    );
  });

  test('keeps the 0% of an @property initial-value when its syntax allows percentages, with single quotes', async () => {
    assert.equal(
      await convert(
        "@property --a{syntax:'<length-percentage>';initial-value:0%}"
      ),
      "@property --a{syntax:'<length-percentage>';initial-value:0%}"
    );
  });

  test('converts the 0% of an @property initial-value when its syntax lacks percentages, with syntax after initial-value', async () => {
    assert.equal(
      await convert("@property --b{initial-value:0%;syntax:'<length>'}"),
      "@property --b{initial-value:0;syntax:'<length>'}"
    );
  });

  test('keeps the 0px of an @property initial-value, which the plugin never shortens to 0', async () => {
    assert.equal(
      await convert('@property --c{syntax:"<length>";initial-value:0px}'),
      '@property --c{syntax:"<length>";initial-value:0px}'
    );
  });

  test('converts a 0% below a rule nested in @property, since only direct declarations keep their context', async () => {
    assert.equal(
      await convert('@property --f{syntax:"<length>";@media (x){width:0%}}'),
      '@property --f{syntax:"<length>";@media (x){width:0}}'
    );
  });

  test('gives each declaration its own result in one stylesheet with every context', async () => {
    const css = [
      '@keyframes k{from{opacity:1.2;width:0px;stroke-width:0%}}',
      '@-webkit-keyframes k{from{opacity:1.2;stroke-width:0%}}',
      '@property --a{syntax:"<length-percentage>";initial-value:0%}',
      "@property --b{initial-value:0%;syntax:'<length>'}",
      '@property --c{syntax:"<length>";initial-value:0px}',
      'a{opacity:1.2;width:0%;stroke-width:0%}',
    ].join('\n');
    assert.equal(
      await convert(css),
      [
        '@keyframes k{from{opacity:1.2;width:0;stroke-width:0%}}',
        '@-webkit-keyframes k{from{opacity:1.2;stroke-width:0%}}',
        '@property --a{syntax:"<length-percentage>";initial-value:0%}',
        "@property --b{initial-value:0;syntax:'<length>'}",
        '@property --c{syntax:"<length>";initial-value:0px}',
        'a{opacity:1;width:0;stroke-width:0%}',
      ].join('\n')
    );
  });

  test('gives the same output for a stylesheet whether it follows a keyframes stylesheet in one processor or not', async () => {
    const keyframes = '@keyframes k{from{opacity:1.2}}';
    const rule = 'a{opacity:1.2}';
    const processor = postcss([plugin()]);
    await processor.process(keyframes, { from: repositoryFile });
    const followed = await processor.process(rule, { from: repositoryFile });
    assert.equal(followed.css, await convert(rule));
  });
});
