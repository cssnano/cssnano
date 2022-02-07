'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'linear: should convert "to top" to 0deg',
  processCSS(
    'background:linear-gradient(to top,#ffe500,#121)',
    'background:linear-gradient(0deg,#ffe500,#121)'
  )
);

test(
  'linear: should convert "to top" to 0deg (uppercase property and value)',
  processCSS(
    'BACKGROUND:LINEAR-GRADIENT(TO TOP,#ffe500,#121)',
    'BACKGROUND:LINEAR-GRADIENT(0deg,#ffe500,#121)'
  )
);

test(
  'linear: should convert "to right" to 90deg',
  processCSS(
    'background:linear-gradient(to right,#ffe500,#121)',
    'background:linear-gradient(90deg,#ffe500,#121)'
  )
);

test(
  'linear: should convert "to right" to 90deg (uppercase property and value)',
  processCSS(
    'BACKGROUND:LINEAR-GRADIENT(TO RIGHT,#FFE500,#121)',
    'BACKGROUND:LINEAR-GRADIENT(90deg,#FFE500,#121)'
  )
);

test(
  'linear: should convert "to bottom" to 180deg',
  processCSS(
    'background:linear-gradient(to bottom,#ffe500,#121)',
    'background:linear-gradient(180deg,#ffe500,#121)'
  )
);

test(
  'linear: should convert "to left" to 270deg',
  processCSS(
    'background:linear-gradient(to left,#ffe500,#121)',
    'background:linear-gradient(270deg,#ffe500,#121)'
  )
);

test(
  'linear: should convert "to top" to 0deg (with a solid colour)',
  processCSS(
    'background:#ffe500 linear-gradient(to top,#ffe500,#121)',
    'background:#ffe500 linear-gradient(0deg,#ffe500,#121)'
  )
);

test(
  'repeating-linear: should convert "to top" to 0deg',
  processCSS(
    'background:repeating-linear-gradient(to top,#ffe500,#121)',
    'background:repeating-linear-gradient(0deg,#ffe500,#121)'
  )
);

test(
  'repeating-linear: should convert "to top" to 0deg (uppercase)',
  processCSS(
    'background:REPEATING-LINEAR-GRADIENT(TO TOP,#ffe500,#121)',
    'background:REPEATING-LINEAR-GRADIENT(0deg,#ffe500,#121)'
  )
);

test(
  'repeating-linear: should convert "to right" to 90deg',
  processCSS(
    'background:repeating-linear-gradient(to right,#ffe500,#121)',
    'background:repeating-linear-gradient(90deg,#ffe500,#121)'
  )
);

test(
  'repeating-linear: should convert "to bottom" to 180deg',
  processCSS(
    'background:repeating-linear-gradient(to bottom,#ffe500,#121)',
    'background:repeating-linear-gradient(180deg,#ffe500,#121)'
  )
);

test(
  'repeating-linear: should convert "to left" to 270deg',
  processCSS(
    'background:repeating-linear-gradient(to left,#ffe500,#121)',
    'background:repeating-linear-gradient(270deg,#ffe500,#121)'
  )
);

test(
  'repeating-linear: should not remove necessary zero start length',
  passthroughCSS(
    'background:repeating-linear-gradient(-45deg,transparent 0 25%,#d1d3d5 25% 50%)'
  )
);

test(
  'linear: should not convert "to top right" to an angle',
  passthroughCSS('background:linear-gradient(to top right,#ffe500,#121)')
);

test(
  'linear: should not convert "to bottom left" to an angle',
  passthroughCSS('background:linear-gradient(to bottom left,#ffe500,#121)')
);

test(
  'linear: should reduce length values if they are the same',
  processCSS(
    'background:linear-gradient(45deg,#ffe500 50%,#121 50%)',
    'background:linear-gradient(45deg,#ffe500 50%,#121 0)'
  )
);

test(
  'linear: should reduce length values if they are the same (uppercase)',
  processCSS(
    'background:LINEAR-GRADIENT(45DEG,#FFE500 50%,#121 50%)',
    'background:LINEAR-GRADIENT(45DEG,#FFE500 50%,#121 0)'
  )
);

test(
  'linear: should reduce length values if they are less',
  processCSS(
    'background:linear-gradient(45deg,#ffe500 50%,#121 25%)',
    'background:linear-gradient(45deg,#ffe500 50%,#121 0)'
  )
);

test(
  'linear: should not reduce length values with different units',
  passthroughCSS('background:linear-gradient(45deg,#ffe500 25px,#121 20%)')
);

test(
  'linear: should remove the (unnecessary) start/end length values',
  processCSS(
    'background:linear-gradient(#ffe500 0%,#121 100%)',
    'background:linear-gradient(#ffe500,#121)'
  )
);

test(
  'repeating-radial: should reduce length values if they are the same',
  processCSS(
    'background:repeating-radial-gradient(#121,#121 5px,#ffe500 5px,#ffe500 10px)',
    'background:repeating-radial-gradient(#121,#121 5px,#ffe500 0,#ffe500 10px)'
  )
);

test(
  'repeating-radial: should reduce length values if they are the same (uppercase property and value)',
  processCSS(
    'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 5PX,#FFE500 10PX)',
    'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 0,#FFE500 10PX)'
  )
);

test(
  'repeating-radial: should reduce length values if they are the same (last is zero)',
  processCSS(
    'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 5PX,#FFE500 0)',
    'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 0,#FFE500 0)'
  )
);

test(
  'radial: should correctly account for "at"',
  passthroughCSS(
    'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%);'
  )
);
test(
  'radial: should correctly account for uppercase "at"',
  passthroughCSS(
    'background:radial-gradient(AT 50% 0%,rgba(74,74,74,.15),transparent 40%);'
  )
);

test(
  'radial: should correctly account for "at" (2)',
  processCSS(
    'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%, red 40%);',
    'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%, red 0);'
  )
);

test(
  'radial: should correctly account for "at" (2) (uppercase)',
  processCSS(
    'background:radial-gradient(AT 50% 0%,RGBA(74,74,74,.15),TRANSPARENT 40%, RED 40%);',
    'background:radial-gradient(AT 50% 0%,RGBA(74,74,74,.15),TRANSPARENT 40%, RED 0);'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (1)',
  processCSS(
    'background: -webkit-radial-gradient(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)',
    'background: -webkit-radial-gradient(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (1) (uppercase)',
  processCSS(
    'background: -WEBKIT-RADIAL-GRADIENT(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)',
    'background: -WEBKIT-RADIAL-GRADIENT(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (1) with px',
  processCSS(
    'background: -webkit-radial-gradient(50% 26px, circle, #fff, rgba(255, 255, 255, 0) 24%)',
    'background: -webkit-radial-gradient(50% 26px, circle, #fff, rgba(255, 255, 255, 0) 24%)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (1) with px (uppercase)',
  processCSS(
    'background: -webkit-radial-gradient(50% 26PX, circle, #fff, rgba(255, 255, 255, 0) 24%)',
    'background: -webkit-radial-gradient(50% 26PX, circle, #fff, rgba(255, 255, 255, 0) 24%)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (2)',
  processCSS(
    'background: -webkit-radial-gradient(center, 30% 30%, white 20%, black 10%)',
    'background: -webkit-radial-gradient(center, 30% 30%, white 20%, black 0)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (2) (uppercase)',
  processCSS(
    'background: -WEBKIT-RADIAL-GRADIENT(CENTER, 30% 30%, WHITE 20%, BLACK 10%)',
    'background: -WEBKIT-RADIAL-GRADIENT(CENTER, 30% 30%, WHITE 20%, BLACK 0)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (3)',
  processCSS(
    'background: -webkit-radial-gradient(50% 26%, #fff, rgba(255, 255, 255, 0) 24%)',
    'background: -webkit-radial-gradient(50% 26%, #fff, rgba(255, 255, 255, 0) 24%)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (4)',
  processCSS(
    'background: -webkit-radial-gradient(white 50%, black 40%)',
    'background: -webkit-radial-gradient(white 50%, black 0)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (4) (uppercase)',
  processCSS(
    'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50%, BLACK 40%)',
    'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50%, BLACK 0)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (4) with px (uppercase)',
  processCSS(
    'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50px, BLACK 400PX)',
    'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50px, BLACK 400PX)'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (5)',
  processCSS(
    'background: -webkit-radial-gradient(white calc(30%), black calc(50%))',
    'background: -webkit-radial-gradient(white calc(30%), black calc(50%))'
  )
);

test(
  'radial: should correctly account with prefix "-webkit" (5) (calc uppercase)',
  processCSS(
    'background: -webkit-radial-gradient(white CALC(30%), black calc(50%))',
    'background: -webkit-radial-gradient(white CALC(30%), black calc(50%))'
  )
);

test(
  'should not mangle floating point numbers',
  processCSS(
    'background:linear-gradient(#fff,#fff 2em,#ccc 2em,#ccc 2.1em,#fff 2.1em)',
    'background:linear-gradient(#fff,#fff 2em,#ccc 0,#ccc 2.1em,#fff 0)'
  )
);

test(
  'should not mangle floating point numbers (uppercase)',
  processCSS(
    'background:LINEAR-GRADIENT(#FFF,#FFF 2EM,#CCC 2EM,#CCC 2.1EM,#FFF 2.1EM)',
    'background:LINEAR-GRADIENT(#FFF,#FFF 2EM,#CCC 0,#CCC 2.1EM,#FFF 0)'
  )
);

test(
  'should not mangle floating point numbers 1 (uppercase)',
  processCSS(
    'background:lInEaR-gRaDiEnT(#fFf,#fFf 2Em,#cCc 2eM,#cCc 2.1eM,#fFf 2.1EM)',
    'background:lInEaR-gRaDiEnT(#fFf,#fFf 2Em,#cCc 0,#cCc 2.1eM,#fFf 0)'
  )
);

test(
  'should not remove the trailing zero if it is the last stop',
  passthroughCSS('background: linear-gradient(90deg,transparent,#00aeef 0)')
);

test(
  'should not remove point number if it its different type from a previous one',
  passthroughCSS(
    'background: linear-gradient(to left bottom,transparent calc(50% - 2px),#a7a7a8 0,#a7a7a8 calc(50% + 2px),transparent 0)'
  )
);

test(
  'should not throw on empty linear gradients',
  passthroughCSS('background: linear-gradient()')
);

test(
  'should not throw on empty radial gradients',
  passthroughCSS('background: radial-gradient()')
);

test(
  'should pass through custom property references',
  passthroughCSS('background-image:var(--bg),linear-gradient(red,blue)')
);

test(
  'should pass through custom property references #2',
  passthroughCSS(
    'background:linear-gradient(to var(--var), transparent, black) 0% 50% no-repeat'
  )
);

test(
  'should pass through custom property references #3',
  passthroughCSS(
    'background:linear-gradient(var(--var), transparent, black) 0% 50% no-repeat'
  )
);

test(
  'should pass through custom property references #4',
  passthroughCSS(
    'background:linear-gradient(var(--var), black) 0% 50% no-repeat'
  )
);

test(
  'should pass through custom property references #5',
  passthroughCSS('background:linear-gradient(var(--var)) 0% 50% no-repeat')
);

test(
  'should pass through custom property references #6',
  passthroughCSS(
    'background:linear-gradient(var(--var), rgba(255,0,0,0) 70.71%)'
  )
);

test(
  'should pass through custom property references #7',
  passthroughCSS(
    'background:linear-gradient(to env(--var), transparent, black) 0% 50% no-repeat'
  )
);

test(
  'should pass through custom property references #8',
  passthroughCSS('background:linear-gradient(var(--var))')
);

test(
  'should pass through custom property references #9',
  passthroughCSS(
    'background:linear-gradient(var(--foo), var(--bar), var(--baz))'
  )
);

test(
  'should pass through env property references',
  passthroughCSS('background:linear-gradient(env(--var))')
);

test('should not throw error on broken syntax', passthroughCSS('background:'));

test(
  'should not operate on declarations without gradients',
  passthroughCSS('background:red')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
