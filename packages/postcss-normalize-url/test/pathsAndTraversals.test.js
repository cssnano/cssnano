import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processor, processCSS } = processCSSFactory(plugin);

function processCSSAndConverge(fixture, expected, options) {
  return async () => {
    const result = await processor(fixture, options);
    assert.strictEqual(result.css, expected);
    const converged = await processor(result.css, options);
    assert.strictEqual(converged.css, expected);
    return result;
  };
}

describe('Normalize', () => {
  test(
    'should normalize directory traversal',
    processCSS(
      'h1{background:url(http://website.com/assets/css/../font/t.eot)}',
      'h1{background:url(http://website.com/assets/font/t.eot)}'
    )
  );

  test(
    'should normalize directory traversal in relative urls',
    processCSS(
      'h1{background:url(css/../font/t.eot)}',
      'h1{background:url(font/t.eot)}'
    )
  );
});

test(
  'should trim current directory indicator in relative urls',
  processCSS(
    'h1{background:url(./images/cat.png)}',
    'h1{background:url(images/cat.png)}'
  )
);

test(
  'should do the above tests, stripping quotes',
  processCSS(
    'h1{background:url("./css/../font/t.eot")}',
    'h1{background:url(font/t.eot)}'
  )
);

test(
  'should pass through trailing slashes',
  processCSS(
    'h1{background:url("https://localhost:4321/api/woff2/inter.woff2/")}',
    'h1{background:url(https://localhost:4321/api/woff2/inter.woff2/)}'
  )
);

describe('Normalize', () => {
  test(
    'should normalize urls with special characters',
    processCSS(
      'h1{background:url("http://website.com/test/../(images)/1.png")}',
      'h1{background:url("http://website.com/(images)/1.png")}'
    )
  );

  test(
    'should normalize relative urls with special characters',
    processCSS(
      'h1{background:url("test/../(images)/1.png")}',
      'h1{background:url("(images)/1.png")}'
    )
  );
});

test(
  'should process multiple backgrounds',
  processCSS(
    'h1{background:url(   "./test/../foo/bar.jpg"  ), url("http://website.com/img.jpg")}',
    'h1{background:url(foo/bar.jpg), url(http://website.com/img.jpg)}'
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
  'should resolve dot segments between path segments in relative urls',
  processCSS(
    'h1{background:url("a/./b/../c.png")}',
    'h1{background:url(a/c.png)}'
  )
);

test(
  'should normalize URL path while retaining quotes when CSS Values 4 URL modifiers are present',
  processCSS(
    'h1{background:url("css/../img.png" type("image/png"))}',
    'h1{background:url("img.png" type("image/png"))}'
  )
);

test(
  'should normalize pathname before query parameter and hash in relative urls',
  processCSS(
    'h1{background:url("foo/../bar.png?a=1#b")}',
    'h1{background:url(bar.png?a=1#b)}'
  )
);

test(
  'should preserve Windows drive letter paths without treating them as schemes',
  processCSS(
    'h1{background:url("c:/foo/../bar.png")}',
    'h1{background:url(c:/bar.png)}'
  )
);

test(
  'should preserve Windows drive root on excess parent traversal',
  processCSS(
    'h1{background:url("c:/../foo.png")}',
    'h1{background:url(c:/foo.png)}'
  )
);

test(
  'should preserve Windows drive root on multiple excess parent traversal',
  processCSS(
    'h1{background:url("c:/foo/../../bar.png")}',
    'h1{background:url(c:/bar.png)}'
  )
);

test(
  'should preserve Windows drive root when resolving to drive root',
  processCSS('h1{background:url("c:/..")}', 'h1{background:url(c:/)}')
);

test(
  'should normalize root-relative paths with dot segments',
  processCSS(
    'h1{background:url("/a/../b/c.png")}',
    'h1{background:url(/b/c.png)}'
  )
);

test(
  'should normalize excess parent traversal in root-relative paths to root',
  processCSS('h1{background:url("/..")}', 'h1{background:url(/)}')
);

test(
  'should preserve directory dot references without collapsing to empty url()',
  processCSS(
    'h1{background:url(".")}h2{background:url("./")}',
    'h1{background:url(.)}h2{background:url(./)}'
  )
);

test(
  'should normalize paths resolving to directory dot without collapsing to empty url()',
  processCSS(
    'h1{background:url("a/..")}h2{background:url("a/../")}',
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
  'should preserve user slash presence when resolving multiple dot segments to parent traversal',
  processCSS(
    'h1{background:url("a/../..")}h2{background:url("a/../../")}',
    'h1{background:url(..)}h2{background:url(../)}'
  )
);

test(
  'should correctly handle url() preceded by nested parentheses',
  processCSS(
    'h1{background:calc((10px + 2px)) url("css/../font/t.eot")}',
    'h1{background:calc((10px + 2px)) url(font/t.eot)}'
  )
);

test('should not override decl.value when decl.raws.value has stale raw representation', async () => {
  const decl = (
    await (
      await import('postcss')
    )
      .default([plugin()])
      .process('h1{background:url("foo/../bar.png")}', { from: undefined })
  ).root.first.first;
  // Simulate stale raws from a prior plugin:
  decl.value = 'url("a/../b.png")';
  decl.raws = {
    value: { raw: 'url("old/../stale.png")', value: 'url("old/../stale.png")' },
  };
  await (
    await import('postcss')
  )
    .default([plugin()])
    .process(decl.root(), { from: undefined });
  assert.strictEqual(decl.value, 'url(b.png)');
});

test(
  'should normalize URLs in CSS custom properties',
  processCSS(
    ':root{--bg:url("a/../b.png");--hero:url("http://example.com/dir/../logo.png")}',
    ':root{--bg:url(b.png);--hero:url(http://example.com/logo.png)}'
  )
);

test(
  'should preserve ./ prefix when relative path first segment contains a colon (RFC 3986 §4.2)',
  processCSSAndConverge(
    'h1{background:url("./foo:bar.png")}h2{background:url("./sub:dir/icon.png")}',
    'h1{background:url(./foo:bar.png)}h2{background:url(./sub:dir/icon.png)}'
  )
);

test(
  'should prepend ./ when resolving dot segments produces a first segment containing a colon',
  processCSSAndConverge(
    'h1{background:url("a/../foo:bar.png")}h2{background:url("dir/../sub:dir/icon.png")}',
    'h1{background:url(./foo:bar.png)}h2{background:url(./sub:dir/icon.png)}'
  )
);

test(
  'should decode unreserved percent-encoded characters in relative urls',
  processCSSAndConverge(
    'h1{background:url("%7Euser/icon.png")}h2{background:url("path/%2D%5F%7E/test.png")}',
    'h1{background:url(~user/icon.png)}h2{background:url(path/-_~/test.png)}'
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

test(
  'should normalize duplicate slashes in relative paths',
  processCSSAndConverge(
    'h1{background:url("foo//bar///baz.png")}h2{background:url("/foo//bar///baz.png")}',
    'h1{background:url(foo/bar/baz.png)}h2{background:url(/foo/bar/baz.png)}'
  )
);

test(
  'should preserve query parameters with percent-encoded octets in relative urls',
  processCSSAndConverge(
    'h1{background:url("%7Euser.png?v=%7E1")}',
    'h1{background:url(~user.png?v=%7E1)}'
  )
);

test(
  'should retain ./ when decoding unreserved octet reveals a colon in first segment',
  processCSSAndConverge(
    'h1{background:url("./%61:b.png")}',
    'h1{background:url(./a:b.png)}'
  )
);

test(
  'should normalize dot segments in CSS Values 4 src() function while retaining quotes',
  processCSS(
    '@font-face{src:src("fonts/../font.woff2")}',
    '@font-face{src:src("font.woff2")}'
  )
);

test(
  'should retain single quotes in CSS Values 4 src() function',
  processCSS(
    "@font-face{src:src('fonts/../font.woff2')}",
    "@font-face{src:src('font.woff2')}"
  )
);

test(
  'should normalize URL path in src() with modifiers while retaining quotes',
  processCSS(
    '@font-face{src:src("fonts/../font.woff2" format("woff2"))}',
    '@font-face{src:src("font.woff2" format("woff2"))}'
  )
);

test(
  'should minimise whitespace inside CSS Values 4 src() function',
  processCSS(
    'h1{background:src(   "sub/../image.png"   )}',
    'h1{background:src("image.png")}'
  )
);

test(
  'should normalize dot segments in IRI paths with UTF-8 characters',
  processCSS(
    'h1{background:url("https://example.com/café/../menu")}',
    'h1{background:url(https://example.com/menu)}'
  )
);

test(
  'should normalize relative dot segments with non-ASCII characters',
  processCSS(
    'h1{background:url("./日本語/../icon.png")}',
    'h1{background:url(icon.png)}'
  )
);
