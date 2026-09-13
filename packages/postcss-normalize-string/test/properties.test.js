import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Work', () => {
  test(
    'should work with quotes',
    processCSS(`q{quotes:'«' "»"}`, `q{quotes:"«" "»"}`)
  );

  test(
    'should work with language overrides',
    processCSS(
      `p{font-language-override:'DAN'}`,
      `p{font-language-override:"DAN"}`
    )
  );

  test(
    'should work with css grids',
    processCSS(
      `p{grid-template:'a a a' "b b b"}`,
      `p{grid-template:"a a a" "b b b"}`
    )
  );

  test(
    'should work with css grids (2)',
    processCSS(
      `p{grid-template-areas:'a a a' "b b b"}`,
      `p{grid-template-areas:"a a a" "b b b"}`
    )
  );

  test(
    'should work with list styles',
    processCSS(`ul{list-style-type:'-'}`, `ul{list-style-type:"-"}`)
  );

  test(
    'should work with text emphasis styles',
    processCSS(
      `p{text-emphasis-style:'\\25B2'}`,
      `p{text-emphasis-style:"\\25B2"}`
    )
  );

  test(
    'should work with text overflow',
    processCSS(`p{text-overflow:'…' '…'}`, `p{text-overflow:"…" "…"}`)
  );

  test(
    'should work with font',
    processCSS(`p{font:1em/1.5 'slab serif'}`, `p{font:1em/1.5 "slab serif"}`)
  );

  test(
    'should work with font family',
    processCSS(`p{font-family:'slab serif'}`, `p{font-family:"slab serif"}`)
  );

  test(
    'should work with font feature settings',
    processCSS(
      `p{font-feature-settings:'frac'}`,
      `p{font-feature-settings:"frac"}`
    )
  );

  test(
    'should work with web fonts',
    processCSS(
      `@font-face{font-family:'slab serif';src:local('slab serif'),url(slab.ttf) format('truetype')}`,
      `@font-face{font-family:"slab serif";src:local("slab serif"),url(slab.ttf) format("truetype")}`
    )
  );
});

describe('Remove', () => {
  test(
    'should remove unnecessary backslashes in urls',
    processCSS(
      `p{background:url('http://example.com/foo\\'bar.jpg')}`,
      `p{background:url("http://example.com/foo'bar.jpg")}`
    )
  );

  test(
    'should remove unnecessary backslashes in urls #1',
    processCSS(
      `p{background:url("http://example.com/foo\\"bar.jpg")}`,
      `p{background:url('http://example.com/foo"bar.jpg')}`
    )
  );
});

test(
  'should work for @import',
  processCSS(`@import url('foo.css')`, `@import url("foo.css")`)
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

describe('Work', () => {
  test(
    'should work for grid-columsn',
    passthroughCSS(`div{grid-column: span 2;}`)
  );

  test(
    'should work for grid-columsn #2',
    passthroughCSS(`div{grid-column: span 2 / 1;}`)
  );

  test(
    'should work for grid-columsn #3',
    passthroughCSS(`div{grid-column: "span 2";}`)
  );

  test('should work for columns', passthroughCSS(`div{columns: 2 auto;}`));
});
