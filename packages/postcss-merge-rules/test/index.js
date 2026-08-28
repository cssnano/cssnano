import { fileURLToPath } from 'node:url';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import nodepath from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import vars from 'postcss-simple-vars';
import comments from 'postcss-discard-comments';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import { pseudoElements } from '../src/lib/ensureCompatibility.js';
import plugin from '../src/index.js';

const { join } = nodepath;
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
  'should preserve repeated declaration merge output',
  processCSS(
    '.one{color:red;display:grid;gap:1rem}.two{color:red;display:grid;gap:1rem;font-weight:700}.three{color:red;display:grid;gap:1rem}',
    '.one,.two{color:red;display:grid;gap:1rem}.two{font-weight:700}.three{color:red;display:grid;gap:1rem}'
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
  'should not merge across container queries',
  passthroughCSS(`@container (min-width: 200px) {
  .mobile {
     display: none;
  }
}
@container (max-width: 100px) {
  .notMobile {
     display: none;
  }
}`)
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

// The worklist's deterministic source-order tie-breaking is one byte smaller
// than the legacy streaming order for this partial-merge choice.
test(
  'should deterministically prefer the smaller opposite-direction partial merge',
  processCSS(
    'h1{color:black}h2{color:black;font-weight:bold}h3{color:black;font-weight:bold}',
    'h1,h2,h3{color:black}h2,h3{font-weight:bold}'
  )
);

test('should converge after a greedy worklist pass', async () => {
  const first = await postcss([plugin]).process(
    'h1{color:black}h2{color:black;font-weight:bold}h3{color:black;font-weight:bold}',
    { from: undefined }
  );
  const second = await postcss([plugin]).process(first.css, {
    from: undefined,
  });

  assert.equal(second.css, first.css);
});

test(
  'should prioritize the merge with the greatest shared-declaration benefit',
  processCSS(
    '@media x{.a{margin:1px;}}.b{margin:blue;color:1px;}.d{display:1px;margin:1px;}.d{color:1px;color:blue;}.d{color:1px;}',
    '@media x{.a{margin:1px;}}.b{margin:blue;}.b,.d{color:1px;}.d{display:1px;margin:1px;color:blue;}'
  )
);

test(
  'should revisit a predecessor after replacing an adjacent pair',
  processCSS(
    '.a,.b{x:1}.a{color:red}.b{color:red;background:blue}',
    '.a,.b{x:1;color:red}.b{background:blue}'
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
  'should not incorrectly extract border properties',
  passthroughCSS(
    '.a{border-top: 10px solid blue; border-width: 1px;} .b {border-left: 10px solid blue; border-width: 1px;}'
  )
);

test(
  'should not incorrectly extract flex properties',
  processCSS(
    '.a { place-content: center; justify-content: start; } .b { justify-content: start; place-content: center; }',
    '.a { place-content: center; } .a,.b { justify-content: start; } .b { place-content: center; }'
  )
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

// `border-color` has to stay put in both rules, since the `border-bottom-color`
// that follows it differs between them. `border-bottom-style` is a different
// longhand, so nothing here overrides it and it can be hoisted on its own.
test(
  'should respect property order (2)',
  processCSS(
    '.a{ border-color:transparent; border-bottom-color:#111111; border-bottom-style:solid; }.b{ border-color:transparent; border-bottom-color:#222222; border-bottom-style:solid; }',
    '.a{ border-color:transparent; border-bottom-color:#111111; }.a,.b{ border-bottom-style:solid; }.b{ border-color:transparent; border-bottom-color:#222222; }'
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

// `font-weight` appears twice, and both declarations are shared, so they travel
// into the merged rule together and keep their order. The `font-feature-settings`
// declarations between them are a different longhand and do not hold them back.
test(
  'should hoist a declaration together with the one that overrides it',
  processCSS(
    `.name {
        font-family:Inter,sans-serif;
        font-weight:400;
        font-size:18px;
        line-height:1.5;
        letter-spacing:-.01em;
        -webkit-font-feature-settings:"ccmp","locl";
        -moz-font-feature-settings:"ccmp","locl";
        font-feature-settings:"ccmp","locl";
        font-weight:600
      }
      .name.small {
        font-family:Inter,sans-serif;
        font-weight:400;
        font-size:16px;
        line-height:1.5;
        letter-spacing:-.01em;
        -webkit-font-feature-settings:"ccmp","locl";
        -moz-font-feature-settings:"ccmp","locl";
        font-feature-settings:"ccmp","locl";
        font-weight:600
      }`,
    `.name {
        font-size:18px
      }
      .name,.name.small {
        font-family:Inter,sans-serif;
        font-weight:400;
        line-height:1.5;
        letter-spacing:-.01em;
        -webkit-font-feature-settings:"ccmp","locl";
        -moz-font-feature-settings:"ccmp","locl";
        font-feature-settings:"ccmp","locl";
        font-weight:600
      }
      .name.small {
        font-size:16px
      }`
  )
);

test(
  'should not hoist a declaration whose only override is dropped later',
  passthroughCSS(
    '.a{font-weight:700;font:12px serif;font:14px serif}.b{font-weight:700;font:12px serif;font-family:serif;font:14px serif}'
  )
);

test(
  'should not hoist a longhand over a shorthand that stays behind',
  passthroughCSS(
    '.a{font-weight:700;font:12px serif}.b{font-weight:700;font-family:serif;font:12px serif}'
  )
);

test(
  'should not hoist a declaration reset by all in the same rule',
  passthroughCSS('.a{color:red;all:initial}.b{color:red;font-size:12px}')
);

test(
  'should keep hoisting declarations all does not reset',
  processCSS(
    '.a{direction:ltr;all:initial}.b{direction:ltr;color:red}',
    '.a{all:initial}.a,.b{direction:ltr}.b{color:red}'
  )
);

test(
  'should only remove the declaration the merged rule replaces',
  processCSS(
    '.a{margin-left:2px;color:red}.b{margin-left:2px;margin:1px;margin-left:2px}',
    '.a{color:red}.a,.b{margin-left:2px}.b{margin:1px;margin-left:2px}'
  )
);

test(
  'should hoist a declaration a later shorthand of another family does not reset',
  processCSS(
    '.a{border-radius:0;border:none;color:red}.b{border-radius:0;border:none}',
    '.a{color:red}.a,.b{border-radius:0;border:none}'
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
    { overrideBrowserslist: 'Chrome 58' }
  )
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    from: join(testDir, 'browserslist/example.css'),
    env: 'legacy',
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using webpack file path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    file: join(testDir, 'browserslist/example.css'),
    env: 'legacy',
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using custom path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    path: join(testDir, 'browserslist'),
    env: 'legacy',
  })
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using webpack file path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using custom path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    }
  )
);

test(
  'should not merge general sibling combinators',
  passthroughCSS('div{color:#fff}a ~ b{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge child combinators',
  passthroughCSS('div{color:#fff}a > b{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1)',
  passthroughCSS('div{color:#fff}[href]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1) (2)',
  passthroughCSS('div{color:#fff}[href="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1) (3)',
  passthroughCSS('div{color:#fff}[href~="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1) (4)',
  passthroughCSS('div{color:#fff}[href|="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 3)',
  passthroughCSS('div{color:#fff}[href^="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 7',
  })
);

test(
  'should not merge attribute selectors (css 3) (2)',
  passthroughCSS('div{color:#fff}[href$="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 7',
  })
);

test(
  'should not merge attribute selectors (css 3) (3)',
  passthroughCSS('div{color:#fff}[href*="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 7',
  })
);

test(
  'should not merge case insensitive attribute selectors',
  passthroughCSS('div{color:#fff}[href="foo" i]{color:#fff}', {
    overrideBrowserslist: 'Edge 15',
  })
);

const pseudoKeys = Object.keys(pseudoElements);

test(`should not merge ${pseudoKeys.length} pseudo elements`, () => {
  const promises = [];
  for (const pseudo of pseudoKeys) {
    promises.push(
      processCSS(
        `${pseudo}{color:blue}h1{color:blue}`,
        `${pseudo}{color:blue}h1{color:blue}`,
        { overrideBrowserslist: 'IE 6' }
      )
    );
  }
  return Promise.all(promises);
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

  assert.strictEqual(
    res,
    'h1{box-shadow:inset 0 -10px 12px 0 red, inset 0 0 5px 0 red}h1,h2{color:blue}'
  );
});

test('should not crash when node.raws.value is null (2)', () => {
  const css =
    '#foo .bar { margin-left: auto ; margin-right: auto ; } #foo .qux { margin-right: auto ; }';
  const res = postcss([comments(), plugin]).process(css).css;

  assert.strictEqual(
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
  'should merge @media inside @layer with custom properties',
  passthroughCSS(`@layer utilities {
  .dark\\:border-zinc-700 {
    @media (prefers-color-scheme: dark) {
      border-color: var(--color-zinc-700);
    }
  }
  .dark\\:bg-black {
    @media (prefers-color-scheme: dark) {
      background-color: var(--color-black);
    }
  }
  .dark\\:bg-neutralDark {
    @media (prefers-color-scheme: dark) {
      background-color: var(--color-neutralDark);
    }
  }
  .dark\\:text-gray-200 {
    @media (prefers-color-scheme: dark) {
      color: var(--color-gray-200);
    }
  }
  .dark\\:text-white {
    @media (prefers-color-scheme: dark) {
      color: var(--color-white);
    }
  }
}`)
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
  'should prefer the smaller opposite-direction partial merge across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{color:black}h2{color:black;font-weight:bold}}',
      '@media (width:40px){h3{color:black;font-weight:bold}}',
    ].join(''),
    [
      '@media (width:40px){h1,h2,h3{color:black}h2,h3{font-weight:bold}}',
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

test(
  'should not merge nested rules',
  passthroughCSS('h1 { .a { color: red; } } h1 { .b { color: red; } }')
);

test(
  'should not crash on comment',
  processCSS(
    '.a,/*! x, y */.b{color:red}\n.c{color:red}',
    '.a,.b,.c{color:red}'
  )
);

test(
  'should merge identical media queries without reordering conflicting nth-child rules',
  processCSS(
    `@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 15%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 0
  }
}
@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 18.4%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 1%
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(5n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(5n-4) {
    margin-left: 0
  }
}`,
    `@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 15%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 0
  }
  .container .card:not(.nomargin) {
    width: 18.4%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 1%
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(5n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(5n-4) {
    margin-left: 0
  }
}
@media screen and (min-width:1601px) {
}`
  )
);

test(
  'should not merge nested container rules',
  passthroughCSS(`.mobile {
  @container (min-width: 200px) {
     display: none;
  }
}

.notMobile {
  @container (max-width: 100px) {
     display: none;
  }
}`)
);

// A shared declaration cannot be hoisted past a declaration that overrides it
// and stays behind, whatever the two properties are named. The shorthand
// relations come from `@webref/css`, so cases the old name-based heuristic
// could not see, such as `font` setting `line-height`, are covered too.
for (const [name, fixture] of [
  [
    'font sets line-height',
    '.a{font:12px/1.5 serif;line-height:2}.b{font:12px/1.5 serif}',
  ],
  [
    'border sets the colour of every edge',
    '.a{border-bottom:1px solid red;border-color:blue}.b{border-bottom:1px solid red}',
  ],
  ['gap sets row-gap', '.a{gap:1px;row-gap:5px}.b{gap:1px}'],
  ['inset sets top', '.a{inset:0;top:5px}.b{inset:0}'],
  [
    'columns sets column-count',
    '.a{columns:2 20em;column-count:5}.b{columns:2 20em}',
  ],
  [
    'flex-flow sets flex-wrap',
    '.a{flex-flow:row wrap;flex-wrap:nowrap}.b{flex-flow:row wrap}',
  ],
  [
    'grid-area sets grid-row',
    '.a{grid-area:1/2/3/4;grid-row:9}.b{grid-area:1/2/3/4}',
  ],
  [
    'white-space sets text-wrap',
    '.a{white-space:pre-wrap;text-wrap:nowrap}.b{white-space:pre-wrap}',
  ],
]) {
  test(
    `should not hoist a declaration past a shorthand: ${name}`,
    passthroughCSS(fixture)
  );
}

// The same relation, seen from the later rule: the declaration left behind
// there would end up overriding the merged rule.
test(
  'should not claim a declaration a shorthand overrides in the later rule',
  passthroughCSS('.a{column-gap:1px}.b{gap:0;column-gap:1px}')
);

// A flow-relative property and its physical counterpart are the same property
// under some writing modes, so their order has to hold as well.
for (const [name, fixture] of [
  [
    'margin',
    '.a{margin-inline-start:1px;margin-top:2px}.b{margin-inline-start:1px}',
  ],
  ['inset', '.a{inset-inline-start:1px;left:2px}.b{inset-inline-start:1px}'],
  ['size', '.a{width:5px;inline-size:9px}.b{width:5px}'],
]) {
  test(
    `should not reorder logical and physical properties: ${name}`,
    passthroughCSS(fixture)
  );
}

// Although flex and flex-direction share a name segment, they are independent
test(
  'should merge past an unrelated property in the same family',
  processCSS(
    '.a{flex:1 1 auto;flex-direction:row}.b{flex:1 1 auto}',
    '.a{flex-direction:row}.a,.b{flex:1 1 auto}'
  )
);

test(
  'should merge past an unrelated property in the same family (2)',
  processCSS(
    '.a{place-items:center;appearance:none}.b{place-items:center}',
    '.a{appearance:none}.a,.b{place-items:center}'
  )
);
