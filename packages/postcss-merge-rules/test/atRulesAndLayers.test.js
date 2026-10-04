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

// At-rule names are ASCII case-insensitive, and splitting keyframes would
// repeat a keyframe selector, whose declarations are not merged the same way
// by every browser.
test(
  'should not split keyframes of an uppercase @KEYFRAMES rule',
  passthroughCSS(
    '@KEYFRAMES k{from{opacity:0;color:red}to{opacity:0;color:blue}}'
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
    ['@media print{h1{display:block;color:red}h2{padding:10px}}'].join('')
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
      '@supports (--var:var){.white{color:white}.black{color:black}}',
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
      '@supports (--var:var){@media (width:40px){.white{color:white}.black{color:black}}}',
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

// CSS Nesting keeps a declaration that follows nested rules in source order,
// so `&{color:red}color:blue;&{color:red}` ends red. Joining or moving either
// `&` rule across `color:blue` would make blue win.
test(
  'should keep equal nested rules apart across a declaration of the enclosing rule',
  passthroughCSS('.p{&{color:red}color:blue;&{color:red}}')
);

test(
  'should keep same-selector nested rules apart across a declaration of the enclosing rule',
  passthroughCSS('.p{&{color:red}color:blue;&{color:red;margin:0}}')
);

test(
  'should keep nested rules in equal @media blocks apart across a declaration of the enclosing rule',
  passthroughCSS(
    '.p{@media print{&{color:red}}color:blue;@media print{&{color:red;margin:0}}}'
  )
);

test(
  'should keep nested rules apart across a declaration in a nested @media block',
  passthroughCSS('.p{&{color:red}@media print{color:blue}&{color:red}}')
);

test(
  'should merge adjacent nested rules that no declaration of the enclosing rule separates',
  processCSS(
    '.p{.a{color:red}.b{color:red}color:blue}',
    '.p{.a,.b{color:red}color:blue}'
  )
);

test(
  'should merge nested rules in equal @media blocks that no declaration of the enclosing rule separates',
  processCSS(
    '.p{@media print{.a{color:red}}@media print{.b{color:red}}color:blue}',
    '.p{@media print{.a,.b{color:red}}color:blue}'
  )
);

test(
  'should merge nested rules in equal @media blocks when the enclosing rule declares only before the first block',
  processCSS(
    '.p{color:blue;@media print{.a{color:red}}@media print{.b{color:red}}}',
    '.p{color:blue;@media print{.a,.b{color:red}}}'
  )
);

test(
  'should keep nested rules in equal @media blocks apart across a declaration in a different @media block',
  passthroughCSS(
    '.p{@media print{.a{color:red}}@media screen{color:blue}@media print{.b{color:red}}}'
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

test(
  'should remove a named @layer block that a merge emptied, because an earlier block of the layer fixes its order',
  processCSS('@layer x{.a{top:0}}@layer x{.b{top:0}}', '@layer x{.a,.b{top:0}}')
);

test(
  'should remove a nested named @layer block that a merge emptied',
  processCSS(
    '.r{@layer x{.a{top:0}}@layer x{.b{top:0}}}',
    '.r{@layer x{.a,.b{top:0}}}'
  )
);

test(
  'should remove every later named @layer block that a merge emptied',
  processCSS(
    '@layer x{.a{top:0}}@layer x{.b{top:0}}@layer x{.c{top:0}}',
    '@layer x{.a,.b,.c{top:0}}'
  )
);

test(
  'should keep an @layer block that holds a rule after a merge moved another out',
  processCSS(
    '@layer x{.a{top:0}}@layer x{.b{top:0}.d{color:red}}',
    '@layer x{.a,.b{top:0}.d{color:red}}'
  )
);

test(
  'should remove an emptied @layer block nested in an equal @layer block',
  processCSS(
    '@layer a{@layer x{.p{top:0}}}@layer a{@layer x{.q{top:0}}}',
    '@layer a{@layer x{.p,.q{top:0}}}'
  )
);

test(
  'should remove an emptied @layer block with a dotted name',
  processCSS(
    '@layer a.b{.a{top:0}}@layer a.b{.b{top:0}}',
    '@layer a.b{.a,.b{top:0}}'
  )
);

test(
  'should remove an emptied @layer block whose at-rule name is in upper case',
  processCSS('@LAYER x{.a{top:0}}@LAYER x{.b{top:0}}', '@LAYER x{.a,.b{top:0}}')
);

test(
  'should not merge @layer blocks whose names differ in case, because layer names are compared as written',
  passthroughCSS('@layer x{.a{top:0}}@layer X{.b{top:0}}')
);

test(
  'should remove a named @layer block that a merge emptied by moving out its only @media block',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{@media print{.d{top:0}}}',
    '@layer x{@media print{.c,.d{top:0}}}'
  )
);

test(
  'should remove every nested named @layer block that a merge emptied',
  processCSS(
    '@layer a{@layer x{@media print{.c{top:0}}}}@layer a{@layer x{@media print{.d{top:0}}}}',
    '@layer a{@layer x{@media print{.c,.d{top:0}}}}'
  )
);

test(
  'should keep an ancestor @layer block that still holds another rule after its @media block emptied',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{@media print{.d{top:0}}.e{color:red}}',
    '@layer x{@media print{.c,.d{top:0}}}@layer x{.e{color:red}}'
  )
);

test(
  'should keep an ancestor @layer block that holds a comment after its @media block emptied',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{/*k*/@media print{.d{top:0}}}',
    '@layer x{@media print{.c,.d{top:0}}}@layer x{/*k*/}'
  )
);

test(
  'should keep the order in which @layer x and @layer y are declared, because a rule does not move across another layer',
  passthroughCSS(
    '@layer x{@media print{.c{top:0}}}@layer y{.m{color:red}}@layer x{@media print{.d{top:0}}}'
  )
);

test(
  'should keep an emptied @scope block, because postcss-discard-empty is the one that removes it',
  processCSS(
    '@scope (.a){@media print{.c{top:0}}}@scope (.a){@media print{.d{top:0}}}',
    '@scope (.a){@media print{.c,.d{top:0}}}@scope (.a){}'
  )
);

test(
  'should remove an emptied @layer block when two sibling @media blocks move out of it in turn',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{@media print{.d{top:0}}@media print{.e{top:0}}}',
    '@layer x{@media print{.c,.d,.e{top:0}}}'
  )
);

test(
  'should keep an @layer block that is empty in the source, because it may be the first statement that orders its layer',
  passthroughCSS('@layer b{}@layer a{.a{top:0}}')
);

test(
  'should keep an @layer block that is empty in the source beside one that a merge emptied',
  processCSS(
    '@layer b{}@layer x{.a{top:0}}@layer x{.b{top:0}}',
    '@layer b{}@layer x{.a,.b{top:0}}'
  )
);

test(
  'should keep an @media block that is empty in the source beside one that a merge emptied',
  processCSS(
    '@media print{}@media screen{.a{top:0}}@media screen{.b{top:0}}',
    '@media print{}@media screen{.a,.b{top:0}}'
  )
);
