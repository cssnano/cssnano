'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const magician = require('postcss-font-magician');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should trim spaces in simple selectors',
  processCSS('h1,  h2,  h3{color:blue}', 'h1,h2,h3{color:blue}')
);

test(
  'should trim spaces around combinators',
  processCSS('h1 + p, h1 > p, h1 ~ p{color:blue}', 'h1+p,h1>p,h1~p{color:blue}')
);

test(
  'should not trim meaningful spaces',
  passthroughCSS('H2 p,h1 p{color:blue}')
);

test(
  'should reduce meaningful spaces',
  processCSS('h1    p,h2     p{color:blue}', 'h1 p,h2 p{color:blue}')
);

test(
  'should remove qualified universal selectors',
  processCSS(
    '*#id,*.test,*:not(.green),*[href]{color:blue}',
    '#id,.test,:not(.green),[href]{color:blue}'
  )
);

test(
  'should remove complex qualified universal selectors',
  processCSS(
    '[class] + *[href] *:not(*.green){color:blue}',
    '[class]+[href] :not(.green){color:blue}'
  )
);

test(
  'should remove complex qualified universal selectors (2)',
  processCSS('*:not(*.green) ~ *{color:blue}', ':not(.green)~*{color:blue}')
);

test(
  'should not remove meaningful universal selectors',
  processCSS(
    '* + *, * > *, * h1, * ~ *{color:blue}',
    '* h1,*+*,*>*,*~*{color:blue}'
  )
);

test(
  'should preserve the universal selector between comments',
  passthroughCSS('/*comment*/*/*comment*/{color:blue}')
);

test(
  'should preserve the universal selector in attribute selectors',
  processCSS(
    'h1[class=" *.js "] + *.js{color:blue}',
    'h1[class=" *.js "]+.js{color:blue}'
  )
);

test(
  'should preserve the universal selector in filenames',
  passthroughCSS('[filename="*.js"]{color:blue}')
);

test(
  'should preserve the universal selector in file globs',
  passthroughCSS('[glob="/**/*.js"]{color:blue}')
);

test(
  'should preserve escaped zero plus sequences',
  passthroughCSS('.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:blue}')
);

test(
  'should handle deep combinators',
  processCSS(
    'body /deep/ .theme-element{color:blue}',
    'body/deep/.theme-element{color:blue}'
  )
);

test(
  'should sort',
  processCSS(
    '.item1, .item2, .item10, .item11{color:blue}',
    '.item1,.item10,.item11,.item2{color:blue}'
  )
);

test(
  'should dedupe selectors',
  processCSS(
    'h1,h2,h3,h4,h5,h5,h6{color:blue}',
    'h1,h2,h3,h4,h5,h6{color:blue}'
  )
);

test(
  'should trim spaces in :not()',
  processCSS(
    'h1:not(.article, .comments){color:blue}',
    'h1:not(.article,.comments){color:blue}'
  )
);

test(
  'should trim spaces in :not() (2)',
  processCSS(
    'h1:not(.article, .comments), h2:not(.lead, .recommendation){color:blue}',
    'h1:not(.article,.comments),h2:not(.lead,.recommendation){color:blue}'
  )
);

test(
  'should dedupe simple selectors inside :not()',
  processCSS(
    'h1:not(h2, h3, h4, h5, h5, h6){color:blue}',
    'h1:not(h2,h3,h4,h5,h6){color:blue}'
  )
);

test(
  'should normalise attribute selectors',
  processCSS(
    'a[   color=   "blue"    ]{color:blue}',
    'a[color=blue]{color:blue}'
  )
);

test(
  'should normalise attribute selectors (2)',
  passthroughCSS('a[class^="options["]:after{color:blue}')
);

test(
  'should normalise attribute selectors (3)',
  processCSS(
    'a[class="woop_woop_woop"]{color:blue}',
    'a[class=woop_woop_woop]{color:blue}'
  )
);

test(
  'should normalise attribute selectors (4)',
  processCSS(
    'a[class="woop \\\nwoop woop"]{color:blue}',
    'a[class="woop woop woop"]{color:blue}'
  )
);

test(
  'should normalise attribute selectors (5)',
  processCSS(
    'a[   color   =   "blue"    ]{color:blue}',
    'a[color=blue]{color:blue}'
  )
);

test(
  'should normalise attribute selectors (6)',
  processCSS(
    'a[color="blue"   i   ]{color:blue}',
    'a[color=blue i]{color:blue}'
  )
);

test(
  'should normalise attribute selectors (7)',
  processCSS('a[   target   ]{color:blue}', 'a[target]{color:blue}')
);

test(
  'should convert @keyframe from & 100%',
  processCSS(
    '@keyframes test{from{color:red}100%{color:blue}}',
    '@keyframes test{0%{color:red}to{color:blue}}'
  )
);

test(
  'should convert @keyframe from & 100% (2)',
  processCSS(
    '@keyframes test{FROM{color:red}100%{color:blue}}',
    '@keyframes test{0%{color:red}to{color:blue}}'
  )
);

test(
  'should not mangle @keyframe from & 100% in other values',
  passthroughCSS('@keyframes test{x-from-tag{color:red}5100%{color:blue}}')
);

test(
  'should not be responsible for normalising comments',
  processCSS(
    'h1 /*!test comment*/, h2{color:blue}',
    'h1 /*!test comment*/,h2{color:blue}'
  )
);

test(
  'should not be responsible for normalising coments (2)',
  processCSS(
    '/*!test   comment*/h1, h2{color:blue}',
    '/*!test   comment*/h1,h2{color:blue}'
  )
);

test(
  'should transform ::before to :before',
  processCSS('h1::before{color:blue}', 'h1:before{color:blue}')
);

test(
  'should transform ::before to :before (2)',
  processCSS('h1::BEFORE{color:blue}', 'h1:BEFORE{color:blue}')
);

test(
  'should transform ::after to :after',
  processCSS('h1::after{color:blue}', 'h1:after{color:blue}')
);

test(
  'should transform ::first-letter to :first-letter',
  processCSS('h1::first-letter{color:blue}', 'h1:first-letter{color:blue}')
);

test(
  'should transform ::first-line to :first-line',
  processCSS('h1::first-line{color:blue}', 'h1:first-line{color:blue}')
);

test(
  'should not change strings',
  passthroughCSS(
    ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:blue}'
  )
);

test(
  'should not change strings (2)',
  passthroughCSS(
    ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:blue}'
  )
);

test(
  'should not change strings (3)',
  passthroughCSS('[a=":not( *.b, h1, h1 )"]{color:blue}')
);

test(
  'should not change strings (4)',
  passthroughCSS(
    '[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}'
  )
);

test(
  'should not change strings (5)',
  passthroughCSS(
    "[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}"
  )
);

test(
  'should transform qualified attribute selector inside not',
  processCSS(
    ':not( *[href="foo"] ){color:blue}',
    ':not([href=foo]){color:blue}'
  )
);

test(
  'should not mangle attribute selectors',
  processCSS(
    '[class*=" icon-"]+.label, [class^="icon-"]+.label{color:blue}',
    '[class*=" icon-"]+.label,[class^=icon-]+.label{color:blue}'
  )
);

test(
  'should not mangle attribute selectors (2)',
  processCSS(
    '.control-group-inline>input[type="radio"]{color:blue}',
    '.control-group-inline>input[type=radio]{color:blue}'
  )
);

test(
  'should not mangle quoted attribute selectors that contain =',
  passthroughCSS('.parent>.child[data-attr~="key1=1"]{color:blue}')
);

test(
  'should not mangle .from/#from etc',
  passthroughCSS('#from,.from{color:blue}')
);

test(
  'should not mangle pseudo classes',
  passthroughCSS(
    '.btn-group>.btn:last-child:not(:first-child),.btn-group>.dropdown-toggle:not(:first-child){color:blue}'
  )
);

test(
  'should not mangle pseudo classes (2)',
  passthroughCSS(
    '.btn-group>.btn-group:first-child:not(:last-child)>.btn:last-child,.btn-group>.btn-group:first-child:not(:last-child)>.dropdown-toggle{color:blue}'
  )
);

test(
  'should not throw on polymer mixins',
  passthroughCSS('--my-toolbar-theme:{color:blue};')
);

test(
  'should not throw on polymer mixins (2)',
  passthroughCSS('paper-button{--paper-button-ink-color:#009688}')
);

test(
  'should not unquote a single hyphen as an attribute value',
  passthroughCSS('[title="-"]{color:blue}')
);

test(
  'should handle case insensitive attribute selectors with extra spaces',
  processCSS('[title="foo"   i    ]{color:blue}', '[title=foo i]{color:blue}')
);

test(
  'should not remove quotes around an empty attribute selector',
  passthroughCSS('[title=""]{color:blue}')
);

test(
  'should convert :nth-child(1) to :first-child',
  processCSS('p:nth-child(1){color:blue}', 'p:first-child{color:blue}')
);

test(
  'should convert :nth-child(1) to :first-child (2)',
  processCSS('p:NTH-CHILD(1){color:blue}', 'p:first-child{color:blue}')
);

test(
  'should convert :nth-child(2n + 1) to :nth-child(odd)',
  processCSS('p:nth-child(2n + 1){color:blue}', 'p:nth-child(odd){color:blue}')
);

test(
  'should convert :nth-child(even) to :nth-child(2n)',
  processCSS('p:nth-child(even){color:blue}', 'p:nth-child(2n){color:blue}')
);

test(
  'should convert :nth-child(even) to :nth-child(2n) (2)',
  processCSS('p:nth-child(EVEN){color:blue}', 'p:nth-child(2n){color:blue}')
);

test(
  'should convert :nth-of-type(1) to :first-of-type',
  processCSS('p:nth-of-type(1){color:blue}', 'p:first-of-type{color:blue}')
);

test(
  'should convert :nth-of-type(2n + 1) to :nth-of-type(odd)',
  processCSS(
    'p:nth-of-type(2n + 1){color:blue}',
    'p:nth-of-type(odd){color:blue}'
  )
);

test(
  'should convert :nth-of-type(2n + 1) to :nth-of-type(odd) (2)',
  processCSS(
    'p:nth-of-type(2N + 1){color:blue}',
    'p:nth-of-type(odd){color:blue}'
  )
);

test(
  'should convert :nth-of-type(even) to :nth-of-type(2n)',
  processCSS('p:nth-of-type(even){color:blue}', 'p:nth-of-type(2n){color:blue}')
);

test(
  'should convert :nth-last-child(1) to :last-child',
  processCSS('p:nth-last-child(1){color:blue}', 'p:last-child{color:blue}')
);

test(
  'should convert :nth-last-child(2n + 1) to :nth-last-child(odd)',
  processCSS(
    'p:nth-last-child(2n + 1){color:blue}',
    'p:nth-last-child(odd){color:blue}'
  )
);

test(
  'should convert :nth-last-child(even) to :nth-last-child(2n)',
  processCSS(
    'p:nth-last-child(even){color:blue}',
    'p:nth-last-child(2n){color:blue}'
  )
);

test(
  'should convert :nth-last-of-type(1) to :last-of-type',
  processCSS('p:nth-last-of-type(1){color:blue}', 'p:last-of-type{color:blue}')
);

test(
  'should convert :nth-last-of-type(2n + 1) to :nth-last-of-type(odd)',
  processCSS(
    'p:nth-last-of-type(2n + 1){color:blue}',
    'p:nth-last-of-type(odd){color:blue}'
  )
);

test(
  'should handle :nth-last-of-type(2n + 2)',
  processCSS(
    'p:nth-last-of-type(2n + 2){color:blue}',
    'p:nth-last-of-type(2n+2){color:blue}'
  )
);

test(
  'should convert :nth-last-of-type(even) to :nth-last-of-type(2n)',
  processCSS(
    'p:nth-last-of-type(even){color:blue}',
    'p:nth-last-of-type(2n){color:blue}'
  )
);

test(
  'should handle first/last of type without parameters',
  passthroughCSS('body>h2:not(:first-of-type):not(:last-of-type){color:blue}')
);

test('cssnano issue 39', () => {
  const css =
    'body{font:100%/1.25 "Open Sans", sans-serif;background:#F6F5F4;overflow-x:hidden}';
  assert.not.throws(
    () => postcss([magician(), plugin()]).process(css, { from: undefined }).css
  );
});

/*
 * Reference: https://github.com/tivac/modular-css/issues/228
 */

test('should handle selectors from other plugins', () => {
  function encode(str) {
    let result = '';

    for (let i = 0; i < str.length; i++) {
      result += str.charCodeAt(i).toString(16);
    }

    return result;
  }

  const toModules = () => {
    return {
      postcssPlugin: 'toModules',
      Once(root) {
        root.walkRules((rule) => {
          rule.selectors = rule.selectors.map((selector) => {
            const slice = selector.slice(1);

            return `.${encode(slice).slice(0, 7)}__${slice}`;
          });
        });
      },
    };
  };
  toModules.postcss = true;

  const css = `.test, /* comment #1 - this comment breaks stuff */
.test:hover {  /* comment #2 - ...but this comment is fine */
  position: absolute;
}

.ok {
  padding: 4px;
}`;
  const expected = `.7465737__test,.7465737__test:hover {  /* comment #2 - ...but this comment is fine */
  position: absolute;
}

.6f6b__ok {
  padding: 4px;
}`;
  assert.is(
    postcss([toModules, plugin]).process(css, { from: undefined }).css,
    expected
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'should handle attribute selector and namespace',
  passthroughCSS('::slotted([foo|bar])')
);

test(
  'should handle attribute selector and namespace #2',
  passthroughCSS('div[*|att] {  }')
);

test(
  'should handle attribute selector and namespace #3',
  passthroughCSS('div[|att] {  }')
);
test(
  'should handle attribute selector and namespace #3',
  passthroughCSS('div[att] {  }')
);
test(
  "should not remove equal selectors parts which aren't duplicates #1402",
  processCSS(':where(a,:not(a)) {  }', ':where(a,:not(a)) {  }')
);
test(
  "should not remove equal selectors parts which aren't duplicates #1216",
  processCSS(
    ':where(:nth-child(7),:nth-child(7)~*) {  }',
    ':where(:nth-child(7),:nth-child(7)~*) {  }'
  )
);
test.run();
