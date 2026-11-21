import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../../src/presets/default.js';
import advancedPreset from '../../../src/presets/advanced.js';
import { testTargets } from '../../../../../util/testHelpers.js';

/**
 * @param {string} css
 * @return {Promise<string>}
 */
async function minify(css) {
  const result = await postcss(
    preset({ browserslist: { query: testTargets } })
  ).process(css, {
    from: undefined,
  });
  return result.css;
}

test('a removed first charset leaves no whitespace before the rule that follows it', async () => {
  assert.equal(await minify('\n@charset "utf-8";a{color:red}'), 'a{color:red}');
});

test('a removed first comment leaves no whitespace before the rule that follows it', async () => {
  assert.equal(
    await minify('\n\n/* c */\n  a{color:red}\n b{top:0}'),
    'a{color:red}b{top:0}'
  );
});

test('a removed first empty rule leaves no whitespace before the rule that follows it', async () => {
  assert.equal(await minify('\n\n a{}\n  b{color:red}'), 'b{color:red}');
});

test('a kept charset that leads takes the whitespace of the first charset, trimmed', async () => {
  assert.equal(
    await minify('\n\n@charset "utf-8";\n  a{content:"é"}'),
    '@charset "utf-8";a{content:"é"}'
  );
});

test('a kept charset keeps the whitespace before the rule that follows it when a comment is kept', async () => {
  assert.equal(
    await minify('\n\n@charset "utf-8";\n  /*! k */ a{content:"é"}'),
    '@charset "utf-8";\n  /*! k */a{content:"é"}'
  );
});

test('a removed charset and a removed first rule leave the third rule first without whitespace', async () => {
  assert.equal(
    await minify('\n\n@charset "utf-8";\n a{}\n  b{color:red}'),
    'b{color:red}'
  );
});

test('a comment that leads after removed first rules prints no whitespace of a later removed rule', async () => {
  assert.equal(await minify('a{}  b{}  /*!k*/ '), '/*!k*/');
});

test('the advanced preset prints no leading whitespace when a merge moves the first rule', async () => {
  const result = await postcss(
    advancedPreset({ browserslist: { query: testTargets } })
  ).process('  a,b{ \n  /**/}b,a /*! k */ {color:red}', { from: undefined });
  assert.equal(result.css, 'a,b{color:red}');
});

test('with normalizeWhitespace disabled, the rule that leads prints no whitespace of a rule removed before it', async () => {
  const result = await postcss(
    preset({
      browserslist: { query: testTargets },
      disable: ['normalizeWhitespace'],
    })
  ).process('.x{}\n.y{}\n  .m{color:red}', { from: undefined });
  assert.equal(result.css, '.m{color:red}');
});
