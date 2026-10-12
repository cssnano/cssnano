import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { processor, processCSS, passthroughCSS } = processCSSFactory(plugin);

function processCSSAndConverge(fixture, expected, options) {
  return async () => {
    const result = await processor(fixture, options);
    assert.strictEqual(result.css, expected);
    const converged = await processor(result.css, options);
    assert.strictEqual(converged.css, expected);
    return result;
  };
}

test(
  'should unquote a url() token',
  processCSS('a{background:url("a.png")}', 'a{background:url(a.png)}')
);

test(
  'should trim whitespace in a url() token',
  processCSS('a{background:url(  a.png  )}', 'a{background:url(a.png)}')
);

test(
  'should unquote url() tokens in CSS custom properties',
  processCSS(
    ':root{--bg:url("a.png");--hero:url("b.png")}',
    ':root{--bg:url(a.png);--hero:url(b.png)}'
  )
);

test('should unquote a url() token when decl.raws.value is stale', async () => {
  const root = (
    await postcss([plugin()]).process('h1{background:url("a.png")}', {
      from: undefined,
    })
  ).root;
  const decl = root.first.first;
  // Simulate stale raws left by a prior plugin.
  decl.value = 'url("b.png")';
  decl.raws = {
    value: { raw: 'url("old.png")', value: 'url("old.png")' },
  };
  await postcss([plugin()]).process(root, { from: undefined });
  assert.strictEqual(decl.value, 'url(b.png)');
});

test(
  'should keep dot segments, since a server or bundler may not resolve them like a browser',
  passthroughCSS('a{background:url(../a/./b.png)}')
);

test(
  'should keep duplicate slashes, since /a//b and /a/b identify different resources',
  passthroughCSS('a{background:url(http://example.com/a//b.png)}')
);

test(
  'should keep the trailing dot of a hostname, since it names a different host',
  passthroughCSS('a{background:url(http://example.com./a.png)}')
);

test(
  'should keep percent-encoded unreserved characters',
  passthroughCSS('a{background:url(/%7Efoo/a.png)}')
);

test(
  'should keep the root slash of an absolute URL',
  passthroughCSS('a{background:url(http://example.com/)}')
);

test(
  'should keep dot segments in an @import target',
  passthroughCSS('@import "../a/./b.css";')
);

test(
  'should keep a trailing no-break space when unquoting, since it is not CSS whitespace',
  processCSS(
    'a{background:url("a.png\u00a0")}',
    'a{background:url(a.png\u00a0)}'
  )
);

test(
  'should keep a leading no-break space when unquoting, since it is not CSS whitespace',
  processCSS(
    'a{background:url("\u00a0a.png")}',
    'a{background:url(\u00a0a.png)}'
  )
);

test(
  'should keep the ./ of a relative url whose first segment contains a colon, since dropping it would make the segment a scheme',
  processCSS(
    'h1{background:url("./foo:bar.png")}',
    'h1{background:url(./foo:bar.png)}'
  )
);

test(
  'should keep a Windows drive path as written',
  processCSS(
    'h1{background:url("C:/images/a.png")}',
    'h1{background:url(C:/images/a.png)}'
  )
);

test(
  'should keep non-ASCII path characters as written',
  processCSS(
    'h1{background:url("imágenes/ñ.png")}',
    'h1{background:url(imágenes/ñ.png)}'
  )
);

test(
  'should keep percent-encoded query strings as written',
  processCSS(
    'h1{background:url("a.png?q=%20%3D")}',
    'h1{background:url(a.png?q=%20%3D)}'
  )
);

test(
  'should keep parentheses of a calc() before a url() as written',
  processCSS(
    'h1{background:calc((1px + 2px)) url("a.png")}',
    'h1{background:calc((1px + 2px)) url(a.png)}'
  )
);

test(
  'should pass through trailing slashes',
  processCSS(
    'h1{background:url("https://localhost:4321/api/woff2/inter.woff2/")}',
    'h1{background:url(https://localhost:4321/api/woff2/inter.woff2/)}'
  )
);

test(
  'should preserve query parameters with dot segments in relative urls',
  processCSS(
    'h1{background:url("pic.png?redirect=/a/../b")}',
    'h1{background:url(pic.png?redirect=/a/../b)}'
  )
);

test(
  'should preserve fragments with slashes and dot segments in relative urls',
  processCSS(
    'h1{background:url("sprites.svg#icon/../other")}',
    'h1{background:url(sprites.svg#icon/../other)}'
  )
);

test(
  'should preserve hash-only urls with slashes',
  processCSS(
    'h1{background:url("#layer/../icon")}',
    'h1{background:url(#layer/../icon)}'
  )
);

test(
  'should preserve query and fragment delimiters in unquoted urls',
  processCSS(
    'h1{background:url(pic.png?redirect=/a/../b#top)}',
    'h1{background:url(pic.png?redirect=/a/../b#top)}'
  )
);

test(
  'should preserve excess parent traversal in relative urls',
  processCSS(
    'h1{background:url("../../img/font.png")}',
    'h1{background:url(../../img/font.png)}'
  )
);

test(
  'should preserve directory dot references without collapsing to empty url()',
  processCSS(
    'h1{background:url(".")}h2{background:url("./")}',
    'h1{background:url(.)}h2{background:url(./)}'
  )
);

test(
  'should preserve user slash presence for parent directory traversal',
  processCSS(
    'h1{background:url("..")}h2{background:url("../")}',
    'h1{background:url(..)}h2{background:url(../)}'
  )
);

test(
  'should preserve user slash presence for unquoted parent directory traversal',
  processCSS(
    'h1{background:url(..)}h2{background:url(../)}',
    'h1{background:url(..)}h2{background:url(../)}'
  )
);

test(
  'should not decode percent-encoded dot or slash in relative urls',
  processCSSAndConverge(
    'h1{background:url("foo/%2e%2e/bar.png")}h2{background:url("foo%2fbar.png")}',
    'h1{background:url(foo/%2e%2e/bar.png)}h2{background:url(foo%2fbar.png)}'
  )
);

test(
  'should not decode percent-encoded dot or slash in absolute urls',
  processCSSAndConverge(
    'h1{background:url("http://example.com/foo%2ebar.png")}h2{background:url("http://example.com/foo%2fbar.png")}',
    'h1{background:url(http://example.com/foo%2ebar.png)}h2{background:url(http://example.com/foo%2fbar.png)}'
  )
);

// Edits are applied at tokenizer offsets, which count UTF-16 code units; an
// astral character takes two of them and must not shift later edits.
test(
  'should unquote every url() after one that contains an astral character',
  processCSS(
    'a{background:url("\u{1F600}.png"),url("b.png")}',
    'a{background:url(\u{1F600}.png),url(b.png)}'
  )
);
