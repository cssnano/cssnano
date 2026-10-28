import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import normalizeString from '../../src/plugins/postcss-normalize-string/index.js';
import { oneStagePlugin } from '../../../../util/testHelpers.js';

describe('a kept comment in a selector', () => {
  test('survives a rewrite of the selector through the default preset', async () => {
    const { css } = await postcss(defaultPreset()).process(
      "[a='b'] /*!x*/ c{color:red}",
      { from: undefined }
    );
    assert.equal(css, '[a=b] /*!x*/ c{color:red}');
  });

  test('survives a rewrite of the selector by a stage, with its spacing kept', async () => {
    const { css } = await postcss([oneStagePlugin(normalizeString)()]).process(
      "[a='b'] /*!x*/ c{color:red}",
      { from: undefined }
    );
    assert.equal(css, '[a="b"] /*!x*/ c{color:red}');
  });

  test('survives the merge of its rule with a rule of other selectors', async () => {
    const { css } = await postcss(defaultPreset()).process(
      'c{color:red;margin:0}a /*!x*/,b{color:red;margin:0;top:0}',
      { from: undefined }
    );
    assert.equal(css, 'a /*!x*/,b,c{color:red;margin:0}a /*!x*/,b{top:0}');
  });
});
