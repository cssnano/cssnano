'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should prefer double quotes by default',
  passthroughCSS(`p:after{content:""}`)
);

test(
  'should transform single quotes to double quotes by default',
  processCSS(`p:after{content:''}`, `p:after{content:""}`)
);

test(
  'should transform double quotes to single quotes via an option',
  processCSS(`p:after{content:""}`, `p:after{content:''}`, {
    preferredQuote: 'single',
  })
);

test(
  'should keep single quotes inside a double quoted string intact',
  passthroughCSS(`p:after{content:"'string' is intact"}`)
);

test(
  'should keep double quotes inside a single quoted string intact',
  passthroughCSS(`p:after{content:'"string" is intact'}`)
);

test(
  'should transform escaped single quotation marks if possible',
  processCSS(
    `p:after{content:'\\'string\\' is intact'}`,
    `p:after{content:"'string' is intact"}`
  )
);

test(
  'should transform escaped double quotation marks if possible',
  processCSS(
    `p:after{content:"\\"string\\" is intact"}`,
    `p:after{content:'"string" is intact'}`
  )
);

test(
  'should not transform quotation marks when mixed',
  passthroughCSS(`p:after{content:"\\"string\\" is 'intact'"}`)
);

test(
  'should not transform quotation marks when mixed (2)',
  passthroughCSS(`p:after{content:'"string" is \\'intact\\''}`)
);

test(
  'should transform escaped single quotation marks when mixed',
  processCSS(
    `p:after{content:'\\'string\\' is \\"intact\\"'}`,
    `p:after{content:'\\'string\\' is "intact"'}`
  )
);

test(
  'should transform escaped double quotation marks when mixed',
  processCSS(
    `p:after{content:"\\'string\\' is \\"intact\\""}`,
    `p:after{content:"'string' is \\"intact\\""}`
  )
);

test(
  'should work with the attr function',
  processCSS(
    `p:after{content:'(' attr(href) ')'}`,
    `p:after{content:"(" attr(href) ")"}`
  )
);

/*
 * The whitespace here is kept because it might influence the design
 * e.g. through `white-space: pre;`
 */

test(
  'should join multiple line strings',
  processCSS(
    `p:after{content:" > this is some really\\
                     long text which is broken\\
                     over several lines."}`,
    `p:after{content:" > this is some really                     long text which is broken                     over several lines."}`
  )
);

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
    // {discardUnused: false}
  )
);

test(
  'should remove unnecessary backslashes in urls',
  processCSS(
    `p{background:url('http://example.com/foo\\'bar.jpg')}`,
    `p{background:url("http://example.com/foo'bar.jpg")}`
    // {normalizeUrl: false}
  )
);

test(
  'should remove unnecessary backslashes in urls #1',
  processCSS(
    `p{background:url("http://example.com/foo\\"bar.jpg")}`,
    `p{background:url('http://example.com/foo"bar.jpg')}`
    // {normalizeUrl: false}
  )
);

test(
  'should work in attribute selectors',
  processCSS(
    `[rel='external link']{color:#00f}`,
    `[rel="external link"]{color:#00f}`
  )
);

test(
  'should change strings (1)',
  processCSS(
    `[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:#00f}`,
    `[a='escaped quotes " h1, h1, h1 " h1, h1, h1']{color:#00f}`
  )
);

test(
  'should change strings (2)',
  processCSS(
    `[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:#00f}`,
    `[a="escaped quotes ' h1, h1, h1 ' h1, h1, h1"]{color:#00f}`
  )
);

test(
  'should work for @import',
  processCSS(`@import url('foo.css')`, `@import url("foo.css")`)
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

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
test.run();
