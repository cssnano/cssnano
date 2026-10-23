import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';

/**
 * The output of a preset for one input. Merge is off unless a case turns it on,
 * so the output shows the value and the escape alone.
 */
async function presetOutput(preset, css) {
  const result = await postcss(preset).process(css, { from: undefined });
  return result.css;
}

// A backslash that ends a declaration value, with no semicolon, escapes the
// character that the parser gives to the raw after the block. That character
// must stay with the value, or the output escapes whatever follows it.
suite('an escape that ends the last declaration of a block', () => {
  test('keeps a tab escape after a plain value through the default preset', async () => {
    assert.equal(
      await presetOutput(defaultPreset({ disable: ['merge'] }), 'a{b:c\\\t}'),
      'a{b:c\\\t}'
    );
  });

  test('keeps a tab escape after a color through the default preset', async () => {
    assert.equal(
      await presetOutput(
        defaultPreset({ disable: ['merge'] }),
        'a{color:#ff0000\\\t}'
      ),
      'a{color:#ff0000\\\t}'
    );
  });

  test('keeps a tab escape after a color through the lite preset', async () => {
    assert.equal(
      await presetOutput(litePreset(), 'a{color:#ff0000\\\t}'),
      'a{color:#ff0000\\\t}'
    );
  });

  test('keeps a tab escape after a color when the block is in an at-rule', async () => {
    assert.equal(
      await presetOutput(
        defaultPreset({ disable: ['merge'] }),
        '@media screen{a{color:#ff0000\\\t}}'
      ),
      '@media screen{a{color:#ff0000\\\t}}'
    );
  });
});
