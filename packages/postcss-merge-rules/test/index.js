'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const vars = require('postcss-simple-vars');
const comments = require('postcss-discard-comments'); // alias not loading correctly
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const { pseudoElements } = require('../src/lib/ensureCompatibility.js');
const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge based on declarations',
  processCSS('h1{display:block}h2{display:block}', 'h1,h2{display:block}')
);

test(
  'should merge based on declarations (2)',
  processCSS(
    'h1{color:red;line-height:1.5;font-size:2em}h2{color:red;line-height:1.5;font-size:2em}',
    'h1,h2{color:red;line-height:1.5;font-size:2em}'
  )
);

test(
  'should merge based on declarations, with a different property order',
  processCSS(
    'h1{color:red;line-height:1.5;font-size:2em}h2{font-size:2em;color:red;line-height:1.5}',
    'h1,h2{color:red;line-height:1.5;font-size:2em}'
  )
);

test(
  'should merge based on selectors',
  processCSS(
    'h1{display:block}h1{text-decoration:underline}',
    'h1{display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (2)',
  processCSS(
    'h1{color:red;display:block}h1{text-decoration:underline}',
    'h1{color:red;display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (3)',
  processCSS(
    'h1{font-size:2em;color:#000}h1{background:#fff;line-height:1.5}',
    'h1{font-size:2em;color:#000;background:#fff;line-height:1.5}'
  )
);

test(
  'should merge in media queries',
  processCSS(
    '@media print{h1{display:block}h1{color:red}}',
    '@media print{h1{display:block;color:red}}'
  )
);

test(
  'should merge in media queries (2)',
  processCSS(
    '@media print{h1{display:block}p{display:block}}',
    '@media print{h1,p{display:block}}'
  )
);

test(
  'should merge in media queries (3)',
  processCSS(
    '@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}h3{text-decoration:none}',
    '@media print{h1{color:red}h1,h2{text-decoration:none}}h3{text-decoration:none}'
  )
);

test(
  'should merge in media queries (4)',
  processCSS(
    'h3{text-decoration:none}@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}',
    'h3{text-decoration:none}@media print{h1{color:red}h1,h2{text-decoration:none}}'
  )
);

test(
  'should not merge across media queries',
  passthroughCSS(
    '@media screen and (max-width:480px){h1{display:block}}@media screen and (min-width:480px){h2{display:block}}'
  )
);

test(
  'should not merge across media queries (2)',
  passthroughCSS(
    '@media screen and (max-width:200px){h1{color:red}}@media screen and (min-width:480px){h1{display:block}}'
  )
);

test(
  'should not merge across keyframes',
  passthroughCSS(
    '@-webkit-keyframes test{0%{color:#000}to{color:#fff}}@keyframes test{0%{color:#000}to{color:#fff}}'
  )
);

test(
  'should not merge across keyframes (2)',
  passthroughCSS(
    [
      '@-webkit-keyframes slideInDown{',
      '0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}',
      'to{-webkit-transform:translateY(0);transform:translateY(0)}',
      '}',
      '@keyframes slideInDown{',
      '0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}',
      'to{-webkit-transform:translateY(0);transform:translateY(0)}',
      '}',
    ].join('')
  )
);

test(
  'should not merge across keyframes (3)',
  passthroughCSS(
    [
      '#foo {-webkit-animation-name:some-animation;-moz-animation-name:some-animation;-o-animation-name:some-animation;animation-name:some-animation}',
      '@-webkit-keyframes some-animation{100%{-webkit-transform:scale(2);transform:scale(2)}}',
      '@-moz-keyframes some-animation{100%{-moz-transform:scale(2);transform:scale(2)}}',
      '@-o-keyframes some-animation {100%{-o-transform:scale(2);transform:scale(2)}}',
      '@keyframes some-animation {100%{-webkit-transform:scale(2);-moz-transform:scale(2);-o-transform:scale(2);transform:scale(2)}}',
    ].join('')
  )
);

test(
  'should not merge in different contexts',
  passthroughCSS('h1{display:block}@media print{h1{color:red}}')
);

test(
  'should not merge in different contexts (2)',
  passthroughCSS('@media print{h1{display:block}}h1{color:red}')
);

test(
  'should perform partial merging of selectors',
  processCSS(
    'h1{color:red}h2{color:red;text-decoration:underline}',
    'h1,h2{color:red}h2{text-decoration:underline}'
  )
);

test(
  'should perform partial merging of selectors (2)',
  processCSS(
    'h1{color:red}h2{color:red;text-decoration:underline}h3{color:green;text-decoration:underline}',
    'h1,h2{color:red}h2,h3{text-decoration:underline}h3{color:green}'
  )
);

test(
  'should perform partial merging of selectors (3)',
  processCSS(
    'h1{color:red;text-decoration:underline}h2{text-decoration:underline;color:green}h3{font-weight:bold;color:green}',
    'h1{color:red}h1,h2{text-decoration:underline}h2,h3{color:green}h3{font-weight:bold}'
  )
);

test(
  'should perform partial merging of selectors (4)',
  processCSS(
    '.test0{color:red;border:none;margin:0}.test1{color:green;border:none;margin:0}',
    '.test0{color:red}.test0,.test1{border:none;margin:0}.test1{color:green}'
  )
);

test(
  'should perform partial merging of selectors (5)',
  processCSS(
    'h1{color:red;font-weight:bold}h2{font-weight:bold}h3{text-decoration:none}',
    'h1{color:red}h1,h2{font-weight:bold}h3{text-decoration:none}'
  )
);

test(
  'should perform partial merging of selectors (6)',
  processCSS(
    '.test-1,.test-2{margin-top:10px}.another-test{margin-top:10px;margin-bottom:30px}',
    '.test-1,.test-2,.another-test{margin-top:10px}.another-test{margin-bottom:30px}'
  )
);

test(
  'should perform partial merging of selectors (7)',
  processCSS(
    '.test-1{margin-top:10px;margin-bottom:20px}.test-2{margin-top:10px}.another-test{margin-top:10px;margin-bottom:30px}',
    '.test-1{margin-bottom:20px}.test-1,.test-2,.another-test{margin-top:10px}.another-test{margin-bottom:30px}'
  )
);

test(
  'should perform partial merging of selectors (8)',
  processCSS(
    '.foo{margin:0;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;margin:0}',
    '.foo{margin:0}.foo,.barim{display:block}.barim{line-height:1}.bazaz{font-size:3em;margin:0}'
  )
);

test(
  'should not merge over-eagerly (cssnano#36 [case 3])',
  passthroughCSS(
    '.foobam{font-family:serif;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;font-family:serif}'
  )
);

test(
  'should not merge over-eagerly (cssnano#36 [case 4])',
  processCSS(
    '.foo{font-family:serif;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;font-family:serif}',
    '.foo{font-family:serif}.foo,.barim{display:block}.barim{line-height:1}.bazaz{font-size:3em;font-family:serif}'
  )
);

test(
  'should merge multiple values (cssnano#49)',
  processCSS(
    'h1{border:1px solid red;background-color:red;background-position:50% 100%}h1{border:1px solid red;background-color:red}h1{border:1px solid red}',
    'h1{border:1px solid red;background-color:red;background-position:50% 100%}'
  )
);

test(
  'should perform partial merging of selectors in the opposite direction',
  processCSS(
    'h1{color:black}h2{color:black;font-weight:bold}h3{color:black;font-weight:bold}',
    'h1{color:black}h2,h3{color:black;font-weight:bold}'
  )
);

test(
  'should not perform partial merging of selectors if the output would be longer',
  passthroughCSS(
    '.test0{color:red;border:none;margin:0}.longlonglonglong{color:green;border:none;margin:0}'
  )
);

test(
  'should merge vendor prefixed selectors when vendors are the same',
  processCSS(
    'code ::-moz-selection{background:red}code::-moz-selection{background:red}',
    'code ::-moz-selection,code::-moz-selection{background:red}'
  )
);

test(
  'should not merge mixed vendor prefixes',
  passthroughCSS(
    'code ::-webkit-selection{background:red}code::-moz-selection{background:red}'
  )
);

test(
  'should not merge ms vendor prefixes',
  passthroughCSS(
    'code :-ms-input-placeholder{background:red}code::-ms-input-placeholder{background:red}'
  )
);

test(
  'should not merge mixed vendor prefixes (2)',
  passthroughCSS(
    'input[type=range] { -webkit-appearance: none !important; } input[type=range]::-webkit-slider-runnable-track { height: 2px; width: 100px; background: red; border: none; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none !important; border: none; width: 10px; height: 10px; background: red; } input[type=range]::-moz-range-thumb { border: none; width: 10px; height: 10px; background: red; }'
  )
);

test(
  'should not merge mixed vendor prefixed and non-vendor prefixed',
  passthroughCSS(
    'code ::selection{background:red}code ::-moz-selection{background:red}'
  )
);

test(
  'should merge text-* properties',
  processCSS(
    'h1{color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline}',
    'h1{color:red}h1,h2{text-align:right;text-decoration:underline}'
  )
);

test(
  'should merge text-* properties (2)',
  processCSS(
    'h1{color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline;color:green}',
    'h1{color:red}h1,h2{text-align:right;text-decoration:underline}h2{color:green}'
  )
);

test(
  'should merge text-* properties (3)',
  processCSS(
    'h1{background:white;color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline;color:red}',
    'h1{background:white}h1,h2{color:red;text-align:right;text-decoration:underline}'
  )
);

test(
  'should merge text-* properties (4)',
  processCSS(
    'h1{color:red;text-align:center;text-transform:small-caps}h2{text-align:center;color:red}',
    'h1{text-transform:small-caps}h1,h2{color:red;text-align:center}'
  )
);

test(
  'should merge text-* properties (5)',
  processCSS(
    'h1{text-align:left;text-transform:small-caps}h2{text-align:right;text-transform:small-caps}',
    'h1{text-align:left}h1,h2{text-transform:small-caps}h2{text-align:right}'
  )
);

test(
  'should not incorrectly extract transform properties',
  passthroughCSS(
    '@keyframes a {0%{transform-origin:right bottom;transform:rotate(-90deg);opacity:0}100%{transform-origin:right bottom;transform:rotate(0);opacity:1}}'
  )
);

test(
  'should not incorrectly extract background properties',
  passthroughCSS(
    '.iPhone{background:url(a.png);background-image:url(../../../sprites/c.png);background-repeat:no-repeat;background-position:-102px -74px}.logo{background:url(b.png);background-image:url(../../../sprites/c.png);background-repeat:no-repeat;background-position:-2px -146px}'
  )
);

test(
  'should not incorrectly extract margin properties',
  passthroughCSS('h2{margin-bottom:20px}h1{margin:10px;margin-bottom:20px}')
);

test(
  'should not incorrectly extract margin properties (2)',
  processCSS(
    'h2{color:red;margin-bottom:20px}h1{color:red;margin:10px;margin-bottom:20px}',
    'h2{margin-bottom:20px}h2,h1{color:red}h1{margin:10px;margin-bottom:20px}'
  )
);

test(
  'should not incorrectly extract margin properties (3)',
  passthroughCSS('h2{margin:0;margin-bottom:20px}h1{margin:0;margin-top:20px}')
);

test(
  'should not incorrectly extract margin properties (4)',
  passthroughCSS('h2{margin:0}h1{margin-top:20px;margin:0}')
);

test(
  'should not incorrectly extract display properties',
  passthroughCSS(
    '.box1{display:inline-block;display:block}.box2{display:inline-block}'
  )
);

test(
  'should handle selector hacks',
  processCSS(
    '.classA{*zoom:1}.classB{box-sizing:border-box;position:relative;min-height:100%}.classC{box-sizing:border-box;position:relative}.classD{box-sizing:border-box;position:relative}',
    '.classA{*zoom:1}.classB{min-height:100%}.classB,.classC,.classD{box-sizing:border-box;position:relative}'
  )
);

test('should handle empty rulesets', processCSS('h1{h2{}h3{}}', 'h1{h2,h3{}}'));

test(
  'should not throw on charset declarations',
  processCSS(
    '@charset "utf-8";@charset "utf-8";@charset "utf-8";h1{}h2{}',
    '@charset "utf-8";@charset "utf-8";@charset "utf-8";h1,h2{}'
  )
);

test(
  'should not throw on comment nodes',
  passthroughCSS(
    '.navbar-soft .navbar-nav > .active > a{color:#fff;background-color:#303030}.navbar-soft .navbar-nav > .open > a{color:#fff;background-color:rgba(48,48,48,0.8)}/* caret */.navbar-soft .navbar-nav > .dropdown > a .caret{border-top-color:#777;border-bottom-color:#777}'
  )
);

test(
  'should not throw on comment nodes (2)',
  processCSS(
    'h1{color:black;background:blue/*test*/}h2{background:blue}',
    'h1{color:black/*test*/}h1,h2{background:blue}'
  )
);

test(
  'should not be responsible for deduping declarations when merging',
  processCSS(
    'h1{display:block;display:block}h2{display:block;display:block}',
    'h1,h2{display:block;display:block}'
  )
);

test(
  'should not be responsible for deduping selectors when merging',
  processCSS(
    'h1,h2{display:block}h2,h1{display:block}',
    'h1,h2,h2,h1{display:block}'
  )
);

test(
  'should not merge across font face rules',
  processCSS(
    '.one, .two, .three { font-family: "lorem"; font-weight: normal; } .four { font-family: "lorem", serif; font-weight: normal; }.five { font-family: "lorem"; font-weight: normal; } @font-face { font-family: "lorem"; font-weight: normal; src: url(/assets/lorem.eot); src: url(/assets/lorem.eot?#iefix) format("embedded-opentype"), url(/assets/lorem.woff) format("woff"), url(/assets/lorem.ttf) format("truetype"); }',
    '.one, .two, .three { font-family: "lorem"; font-weight: normal; } .four { font-family: "lorem", serif; }.four,.five { font-weight: normal; }.five { font-family: "lorem"; } @font-face { font-family: "lorem"; font-weight: normal; src: url(/assets/lorem.eot); src: url(/assets/lorem.eot?#iefix) format("embedded-opentype"), url(/assets/lorem.woff) format("woff"), url(/assets/lorem.ttf) format("truetype"); }'
  )
);

test(
  'should not merge across font face rules (2)',
  processCSS(
    '.foo { font-weight: normal; } .bar { font-family: "my-font"; font-weight: normal; } @font-face { font-family: "my-font"; font-weight: normal; src: url("my-font.ttf"); }',
    '.foo,.bar { font-weight: normal; } .bar { font-family: "my-font"; } @font-face { font-family: "my-font"; font-weight: normal; src: url("my-font.ttf"); }'
  )
);

test(
  'should not merge conflicting rules',
  passthroughCSS(
    '.a{font-family:Arial;font-family:Helvetica;}.b{font-family:Arial;}'
  )
);

test(
  'should merge properties with vendor prefixes',
  processCSS(
    '.a{-webkit-transform: translateX(-50%) translateY(-50%) rotate(-90deg);-webkit-overflow-scrolling: touch}.b{-webkit-transform: translateX(-50%) translateY(-50%) rotate(-90deg);}',
    '.a{-webkit-overflow-scrolling: touch}.a,.b{-webkit-transform: translateX(-50%) translateY(-50%) rotate(-90deg);}'
  )
);

test(
  'should respect property order and do nothing',
  passthroughCSS(
    'body { overflow: hidden; overflow-y: scroll; overflow-x: hidden;} main { overflow: hidden }'
  )
);

test(
  'should respect property order and do nothing (2)',
  passthroughCSS(
    '.a{ border-color:transparent; border-bottom-color:#111111; border-bottom-style:solid; }.b{ border-color:transparent; border-bottom-color:#222222; border-bottom-style:solid; }'
  )
);

test(
  'should respect property order and do nothing (3)',
  processCSS(
    '.fb-col-md-6 { color: red; border-color:blue; flex: 0 0 auto; flex-basis: 50%; } .fb-col-md-7 { color: red; border-color:blue; flex: 0 0 auto; flex-basis: 58.3%; }',
    '.fb-col-md-6 { flex: 0 0 auto; flex-basis: 50%; } .fb-col-md-6,.fb-col-md-7 { color: red; border-color:blue; } .fb-col-md-7 { flex: 0 0 auto; flex-basis: 58.3%; }'
  )
);

test(
  'should respect property order and do nothing (4) (cssnano#160)',
  passthroughCSS(
    'one { border: 1px solid black; border-top: none; } two { border: 1px solid black; }'
  )
);

test(
  'should respect property order and do nothing (5) (cssnano#87)',
  passthroughCSS(
    '.dispendium-theme.fr-toolbar.fr-top { border-radius: 0; background-clip: padding-box; box-shadow: none; border: 1px solid #E0E0E0; border-bottom: 0; } .dispendium-theme.fr-toolbar.fr-bottom { border-radius: 0; background-clip: padding-box; box-shadow: none; border: 1px solid #E0E0E0; border-top: 0; }'
  )
);

test(
  'should respect property order and do nothing (6) (issue #19)',
  passthroughCSS(
    ".share .comment-count:before { content: ' '; position: absolute; width: 0; height: 0; right: 7px; top: 26px; border: 5px solid; border-color: #326891 #326891 transparent transparent; } .share .comment-count:after { content: ' '; position: absolute; width: 0; height: 0; right: 8px; top: 24px; border: 5px solid; border-color: #fff #fff transparent transparent; }"
  )
);

test(
  'should not merge @keyframes rules',
  passthroughCSS(
    '@keyframes foo{0%{visibility:visible;transform:scale3d(.85,.85,.85);opacity:0}to{visibility:visible;opacity:1}}'
  )
);

test(
  'should not merge overlapping rules with vendor prefixes',
  passthroughCSS(
    '.foo{background:#fff;-webkit-background-clip:text}.bar{background:#000;-webkit-background-clip:text}'
  )
);

test(
  'should not destroy any declarations when merging',
  processCSS(
    '.a{background-color:#fff}.a{background-color:#717F83;color:#fff}',
    '.a{background-color:#fff;background-color:#717F83;color:#fff}'
  )
);

test(
  'should merge ::placeholder selectors when supported',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    { env: 'chrome58' }
  )
);

test(
  'should not merge general sibling combinators',
  passthroughCSS('div{color:#fff}a ~ b{color:#fff}', { env: 'ie6' })
);

test(
  'should not merge child combinators',
  passthroughCSS('div{color:#fff}a > b{color:#fff}', { env: 'ie6' })
);

test(
  'should not merge attribute selectors (css 2.1)',
  passthroughCSS('div{color:#fff}[href]{color:#fff}', { env: 'ie6' })
);

test(
  'should not merge attribute selectors (css 2.1) (2)',
  passthroughCSS('div{color:#fff}[href="foo"]{color:#fff}', { env: 'ie6' })
);

test(
  'should not merge attribute selectors (css 2.1) (3)',
  passthroughCSS('div{color:#fff}[href~="foo"]{color:#fff}', { env: 'ie6' })
);

test(
  'should not merge attribute selectors (css 2.1) (4)',
  passthroughCSS('div{color:#fff}[href|="foo"]{color:#fff}', { env: 'ie6' })
);

test(
  'should not merge attribute selectors (css 3)',
  passthroughCSS('div{color:#fff}[href^="foo"]{color:#fff}', { env: 'ie7' })
);

test(
  'should not merge attribute selectors (css 3) (2)',
  passthroughCSS('div{color:#fff}[href$="foo"]{color:#fff}', { env: 'ie7' })
);

test(
  'should not merge attribute selectors (css 3) (3)',
  passthroughCSS('div{color:#fff}[href*="foo"]{color:#fff}', { env: 'ie7' })
);

test(
  'should not merge case insensitive attribute selectors',
  passthroughCSS('div{color:#fff}[href="foo" i]{color:#fff}', { env: 'edge15' })
);

const pseudoKeys = Object.keys(pseudoElements);

test(`should not merge ${pseudoKeys.length} pseudo elements`, () => {
  return Promise.all(
    pseudoKeys.reduce((promises, pseudo) => {
      return [
        ...promises,
        processCSS(
          `${pseudo}{color:blue}h1{color:blue}`,
          `${pseudo}{color:blue}h1{color:blue}`,
          { env: 'ie6' }
        ),
      ];
    }, [])
  );
});

test(
  'should handle css mixins',
  passthroughCSS(
    `paper-card{--paper-card-content:{padding-top:0};margin:0 auto 16px;width:768px;max-width:calc(100% - 32px)}`
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test('should not crash when node.raws.value is null', () => {
  const css =
    '$color: red; h1{box-shadow:inset 0 -10px 12px 0 $color, /* some comment */ inset 0 0 5px 0 $color;color:blue}h2{color:blue}';
  const res = postcss([vars(), comments(), plugin]).process(css).css;

  assert.is(
    res,
    'h1{box-shadow:inset 0 -10px 12px 0 red, inset 0 0 5px 0 red}h1,h2{color:blue}'
  );
});

test('should not crash when node.raws.value is null (2)', () => {
  const css =
    '#foo .bar { margin-left: auto ; margin-right: auto ; } #foo .qux { margin-right: auto ; }';
  const res = postcss([comments(), plugin]).process(css).css;

  assert.is(
    res,
    '#foo .bar{ margin-left:auto; } #foo .bar,#foo .qux{ margin-right:auto; }'
  );
});

test(
  'should not merge :host(tagname) with tagname',
  processCSS(
    ':host(tag){display:block}tag{display:block}',
    ':host(tag){display:block}tag{display:block}'
  )
);

test(
  'should not merge unknown and known selector',
  passthroughCSS('p {color: blue}:nonsense {color: blue}')
);

test(
  'should merge multiple media queries',
  processCSS(
    '@media print{h1{display:block}}@media print{h1{color:red}}',
    '@media print{h1{display:block;color:red}}@media print{}'
  )
);

test(
  'should merge multiple media queries (uppercase)',
  processCSS(
    '@media print{h1{display:block}}@MEDIA print{h1{color:red}}',
    '@media print{h1{display:block;color:red}}@MEDIA print{}'
  )
);

test(
  'should not merge nested at-rules',
  passthroughCSS(
    [
      '@media (min-width: 48rem){.wrapper{display: block}}',
      '@supports (display: flex){@media (min-width: 48rem){.wrapper{display:flex}}}',
    ].join('')
  )
);

test(
  'should merge with same at-rule parent',
  processCSS(
    [
      '@media print{h1{display:block}}',
      '@media print{h1{color:red}h2{padding:10px}}',
    ].join(''),
    [
      '@media print{h1{display:block;color:red}h2{padding:10px}}',
      '@media print{}',
    ].join('')
  )
);

test(
  'should merge with same at-rule parent (2)',
  processCSS(
    [
      '@media (width:40px){.red{color:red}}',
      '@media (width:40px){.green{color:green}}',
      '@media (width:40px){.blue{color:blue}}',
      '@supports (--var:var){.white{color:white}}',
      '@supports (--var:var){.black{color:black}}',
    ].join(''),
    [
      '@media (width:40px){.red{color:red}.green{color:green}.blue{color:blue}}',
      '@media (width:40px){}',
      '@media (width:40px){}',
      '@supports (--var:var){.white{color:white}.black{color:black}}',
      '@supports (--var:var){}',
    ].join('')
  )
);

test(
  'should merge with same nested at-rule parents',
  processCSS(
    [
      '@media (width:40px){.red{color:red}}',
      '@media (width:40px){.green{color:green}}',
      '@media (width:40px){.blue{color:blue}}',
      '@supports (--var:var){@media (width:40px){.white{color:white}}}',
      '@supports (--var:var){@media (width:40px){.black{color:black}}}',
    ].join(''),
    [
      '@media (width:40px){.red{color:red}.green{color:green}.blue{color:blue}}',
      '@media (width:40px){}',
      '@media (width:40px){}',
      '@supports (--var:var){@media (width:40px){.white{color:white}.black{color:black}}}',
      '@supports (--var:var){@media (width:40px){}}',
    ].join('')
  )
);

test(
  'should not merge with different at-rule parent',
  passthroughCSS(
    [
      '@media print{h1{display:block}}',
      '@media screen{h1{color:red}h2{padding:10px}}',
    ].join('')
  )
);

test(
  'should not merge with different nested at-rules parents',
  passthroughCSS(
    [
      '@media (min-width: 48rem){.wrapper{display: block}}',
      '@supports (display: flex){@media (min-width: 48rem){.wrapper{display:flex}}}',
    ].join('')
  )
);

test(
  'should not merge with different nested at-rule parents (2)',
  passthroughCSS(
    [
      '@media print{h1{display:block}}',
      '@support (color:red){@media print (color:red){h1{color:red}h2{padding:10px}}}',
    ].join('')
  )
);

test(
  'should merge multiple values across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{border:1px solid red;background-color:red;background-position:50% 100%}}',
      '@media (width:40px){h1{border:1px solid red;background-color:red}}',
      '@media (width:40px){h1{border:1px solid red}}',
    ].join(''),
    [
      '@media (width:40px){h1{border:1px solid red;background-color:red;background-position:50% 100%}}',
      '@media (width:40px){}',
      '@media (width:40px){}',
    ].join('')
  )
);

test(
  'should partially merge selectors in the opposite direction across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{color:black}h2{color:black;font-weight:bold}}',
      '@media (width:40px){h3{color:black;font-weight:bold}}',
    ].join(''),
    [
      '@media (width:40px){h1{color:black}h2,h3{color:black;font-weight:bold}}',
      '@media (width:40px){}',
    ].join('')
  )
);

test(
  'should not merge properties with "all"',
  passthroughCSS(
    '.a{color:red;display:flex;font-size:10px;}.c{all:unset;color:red;display:flex;font-size:10px;}'
  )
);

test(
  'should not merge properties with "all" (2)',
  passthroughCSS('.foo{color:red}.bar{all:unset;color:red}')
);

test(
  'should merge "direction" property with "all"',
  processCSS(
    '.a{color:red;display:flex;font-size:10px;direction:tlr;}.c{all:unset;color:red;display:flex;font-size:10px;direction:tlr;}',
    '.a{color:red;display:flex;font-size:10px;}.a,.c{direction:tlr;}.c{all:unset;color:red;display:flex;font-size:10px;}'
  )
);

test(
  'should merge "unicode-bidi" property with "all"',
  processCSS(
    '.a{color:red;display:flex;font-size:10px;unicode-bidi:normal;}.c{all:unset;color:red;display:flex;font-size:10px;unicode-bidi:normal;}',
    '.a{color:red;display:flex;font-size:10px;}.a,.c{unicode-bidi:normal;}.c{all:unset;color:red;display:flex;font-size:10px;}'
  )
);

test(
  'should not merge :focus-visible',
  processCSS(
    'a{color : green;} a:focus-visible{ color : green;} a:focus-visible{ background : red}',
    'a{color : green;} a:focus-visible{ color : green;} a:focus-visible{ background : red}'
  )
);

test(
  'should merge :visited and :link pseudo-classes',
  processCSS(
    'a,a:link{color:#555}a:visited{color:#555}',
    'a,a:link,a:visited{color:#555}'
  )
);

test(
  'should not merge colors',
  processCSS(
    'h1{color:#001;color:#002;color:#003}h2{color:#001;color:#002}',
    'h1{color:#001;color:#002;color:#003}h2{color:#001;color:#002}'
  )
);
test.run();
