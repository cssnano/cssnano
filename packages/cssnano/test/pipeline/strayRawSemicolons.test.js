import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';

/** The default preset with merge off, so the output shows only the stray semicolons. */
async function presetOutput(css, disable) {
  const result = await postcss(
    defaultPreset({ disable: ['merge', ...disable] })
  ).process(css, { from: undefined });
  return result.css;
}

suite('a stray semicolon before a declaration', () => {
  test('is removed when normalizeWhitespace is on', async () => {
    assert.equal(
      await presetOutput(
        'a{color:red;;_color:blue}b{color:red;_color:blue}',
        []
      ),
      'a{color:red;_color:blue}b{color:red;_color:blue}'
    );
  });

  test('is kept when normalizeWhitespace is disabled', async () => {
    assert.equal(
      await presetOutput('a{color:red;;_color:blue}b{color:red;_color:blue}', [
        'normalizeWhitespace',
      ]),
      'a{color:red;;_color:blue}b{color:red;_color:blue}'
    );
  });

  test('is removed when the declaration before it is a custom property', async () => {
    assert.equal(
      await presetOutput('a{color:red;;--x:blue;;color:green}', []),
      'a{color:red;;--x:blue;color:green}'
    );
  });

  test('is kept before a custom property, whose value the whitespace pass leaves as written', async () => {
    assert.equal(
      await presetOutput('a{color:red;;--x:blue}', []),
      'a{color:red;;--x:blue}'
    );
  });

  test('is kept after a nested rule, which the pass does not touch', async () => {
    assert.equal(
      await presetOutput('a{b{color:red};;color:blue}', []),
      'a{b{color:red};;color:blue}'
    );
  });
});
