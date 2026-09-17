import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
  'should not merge @keyframes rules',
  passthroughCSS(
    '@keyframes foo{0%{visibility:visible;transform:scale3d(.85,.85,.85);opacity:0}to{visibility:visible;opacity:1}}'
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
  'should not merge nested rules',
  passthroughCSS('h1 { .a { color: red; } } h1 { .b { color: red; } }')
);

test(
  'should preserve nested rules when their parent also has matching declarations',
  passthroughCSS(
    '.a { & .child { color: blue; } color: red; } .b { color: red; }'
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

test(
  'should not merge rules across distinct anonymous @layer at-rules',
  passthroughCSS('@layer{#main.foo{color:red}}@layer{.foo{color:blue}}')
);

test(
  'should not merge rules across distinct anonymous @layer at-rules with comments',
  passthroughCSS(
    '@layer /*! important 1 */ {#main.foo{color:red}}@layer /*! important 2 */ {.foo{color:blue}}'
  )
);
