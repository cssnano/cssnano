import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';

/** The default preset with merge off, so the output shows the at-rules alone. */
async function presetOutput(css) {
  const result = await postcss(defaultPreset({ disable: ['merge'] })).process(
    css,
    { from: undefined }
  );
  return result.css;
}

// The at-rules are compared after normalizeString has folded their names, so
// two names that the output writes the same way count as one.
suite('an overridden at-rule compared by its folded prelude', () => {
  test('drops the first keyframes rule when the stylesheet folds its quoted name to the second one', async () => {
    assert.equal(
      await presetOutput(
        '@keyframes \'a\'{from{top:0}}@keyframes "a"{from{top:1px}}'
      ),
      '@keyframes "a"{0%{top:1px}}'
    );
  });

  test('keeps both keyframes rules when one name is unquoted, since the stylesheet does not unquote names', async () => {
    assert.equal(
      await presetOutput(
        '@keyframes a{from{top:0}}@keyframes "a"{from{top:1px}}'
      ),
      '@keyframes a{0%{top:0}}@keyframes "a"{0%{top:1px}}'
    );
  });

  test('keeps an overridable at-rule nested in another overridable one, which the pass does not visit', async () => {
    assert.equal(
      await presetOutput(
        '@keyframes a{@keyframes b{from{top:0}}}@keyframes b{from{top:1px}}'
      ),
      '@keyframes a{@keyframes b{0%{top:0}}}@keyframes b{0%{top:1px}}'
    );
  });

  test('keeps keyframes rules in different media scopes', async () => {
    assert.equal(
      await presetOutput(
        '@media screen{@keyframes a{from{top:0}}}@keyframes a{from{top:1px}}'
      ),
      '@media screen{@keyframes a{0%{top:0}}}@keyframes a{0%{top:1px}}'
    );
  });
});
