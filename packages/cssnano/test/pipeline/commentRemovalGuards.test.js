import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';

/**
 * @param {string} css
 * @param {unknown} plugins the plugins of a preset
 * @returns {Promise<string>}
 */
async function minified(css, plugins) {
  return (await postcss(plugins).process(css, { from: undefined })).css;
}

describe('removing a comment keeps the whitespace after a selector comma', () => {
  test('the lite preset keeps the newline and indent after a comma when the comment is in another item', async () => {
    assert.equal(
      await minified('a,\n  b /* c */{color:red}', litePreset()),
      'a,\n  b{color:red}'
    );
  });
});

describe('discardComments normalizes whitespace of a value that holds an opener in a string', () => {
  test('the whitespace outside the string is normalized when normalizeWhitespace is off', async () => {
    assert.equal(
      await minified(
        'a{transition:"/*"   a    b}',
        defaultPreset({ disable: ['normalizeWhitespace'] })
      ),
      'a{transition:"/*" a b}'
    );
  });

  test('the same value keeps its whitespace when discardComments is off too', async () => {
    assert.equal(
      await minified(
        'a{transition:"/*"   a    b}',
        defaultPreset({ disable: ['normalizeWhitespace', 'discardComments'] })
      ),
      'a{transition:"/*"   a    b}'
    );
  });
});

const withoutDiscardComments = () =>
  defaultPreset({ disable: ['discardComments'] });

describe('a value with a plain comment, with discardComments off', () => {
  test('a commented value that duplicates an earlier value of its rule prints its comment', async () => {
    assert.equal(
      await minified(
        'a{color:red;color:red /* c */}',
        withoutDiscardComments()
      ),
      'a{color:red /* c */}'
    );
  });

  test('a commented value is discarded as the duplicate of a comment-free value in an equal rule', async () => {
    assert.equal(
      await minified(
        'a{color:red /* c */}a{color:red}',
        withoutDiscardComments()
      ),
      'a{color:red}'
    );
  });
});

const withoutNormalizeWhitespace = () =>
  defaultPreset({ disable: ['normalizeWhitespace'] });

describe('the whitespace of a rule after a removed first comment, with normalizeWhitespace off', () => {
  test("a rule after a removed first comment prints the comment's whitespace before", async () => {
    assert.equal(
      await minified(
        '\n\n/* c */\n  .a{color:red}',
        withoutNormalizeWhitespace()
      ),
      '\n\n.a{color:red}'
    );
  });

  test("the rule a merge moves keeps the removed comment's whitespace before", async () => {
    assert.equal(
      await minified(
        '\n/* c */\n\n.a{color:red}\n.b{color:blue}\n.a{background:red}',
        withoutNormalizeWhitespace()
      ),
      '\n.a{color:red;background:red}\n.b{color:blue}'
    );
  });
});
