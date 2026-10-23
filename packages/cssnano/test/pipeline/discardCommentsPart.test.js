import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import litePreset from '#presets/lite';

/**
 * Runs the lite preset with only discardComments, so the output shows what
 * comment removal did and nothing else.
 *
 * @param {string} css
 * @param {import('#postcss-discard-comments').Options} [options]
 * @returns {Promise<string>}
 */
async function discardOnly(css, options) {
  const plugins = litePreset({
    disable: ['normalizeWhitespace', 'discardEmpty', 'rawCache'],
    options: { discardComments: options ?? {} },
  });
  return (await postcss(plugins).process(css, { from: undefined })).css;
}

describe('the comment removal of the walk', () => {
  test('removes a comment node', async () => {
    assert.equal(await discardOnly('/*x*/a{}'), 'a{}');
  });

  test('removes a comment between a property and its colon', async () => {
    assert.equal(await discardOnly('a{color/*x*/:red}'), 'a{color:red}');
  });

  test('removes a comment after a value', async () => {
    assert.equal(await discardOnly('a{color:red/*x*/}'), 'a{color:red}');
  });

  test('removes a comment inside the important flag', async () => {
    assert.equal(
      await discardOnly('a{color:red!/*x*/important}'),
      'a{color:red!important}'
    );
  });

  test('removes a comment after the important flag', async () => {
    assert.equal(
      await discardOnly('a{color:red!important/*x*/}'),
      'a{color:red!important}'
    );
  });

  test('removes a comment in a selector', async () => {
    assert.equal(await discardOnly('a/*x*/ b{}'), 'a b{}');
  });

  test('removes a comment between an at-rule name and its prelude', async () => {
    assert.equal(await discardOnly('@media/*x*/screen{}'), '@media screen{}');
  });

  test('removes a comment at the end of an at-rule prelude', async () => {
    assert.equal(await discardOnly('@media screen/*x*/{}'), '@media screen{}');
  });

  test('keeps an important comment in an at-rule prelude', async () => {
    assert.equal(
      await discardOnly('@media screen/*!x*/and (a){}'),
      '@media screen/*!x*/and (a){}'
    );
  });

  test('keeps an important comment in a selector', async () => {
    assert.equal(await discardOnly("[a='b'] /*!x*/ c{}"), "[a='b'] /*!x*/ c{}");
  });

  test('keeps the first important comment in a value and removes a later one in a comment node', async () => {
    assert.equal(
      await discardOnly('a{color:/*!x*/red}/*!y*/b{}', {
        removeAllButFirst: true,
      }),
      'a{color:/*!x*/red}b{}'
    );
  });

  test('calls remove once per comment, in document order, for two declarations with the same value', async () => {
    /** @type {string[]} */
    const seen = [];
    const css = await discardOnly('a{color:/*!c*/red}b{color:/*!c*/red}', {
      remove(comment) {
        seen.push(comment);
        return true;
      },
    });
    assert.equal(css, 'a{color:red}b{color:red}');
    assert.deepEqual(seen, ['!c', '!c']);
  });

  test('leaves alone an at-rule that another plugin built without a prelude', async () => {
    // A plugin can append an at-rule whose params are undefined; the comment
    // part must not read them.
    const root = postcss.root();
    root.append(postcss.atRule({ name: 'font-face' }));
    const { css } = await postcss(
      litePreset({
        disable: ['normalizeWhitespace', 'discardEmpty', 'rawCache'],
      })
    ).process(root, { from: undefined });
    assert.equal(css, '@font-face');
  });

  test('reads a stale value raw as the value, not as the source', async () => {
    // The raw says `red/*x*/`, but the value is `blue`: the value is the source.
    const root = postcss.parse('a{color:red}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.first
    );
    decl.raws.value = { value: 'red', raw: 'red/*x*/' };
    decl.value = 'blue';
    const { css } = await postcss(
      litePreset({
        disable: ['normalizeWhitespace', 'discardEmpty', 'rawCache'],
      })
    ).process(root, { from: undefined });
    assert.equal(css, 'a{color:blue}');
  });
});
