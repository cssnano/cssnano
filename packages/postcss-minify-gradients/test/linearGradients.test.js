import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Linear gradient direction conversion', () => {
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
    'linear: should not convert "to top right" to an angle',
    passthroughCSS('background:linear-gradient(to top right,#ffe500,#121)')
  );

  test(
    'linear: should not convert "to bottom left" to an angle',
    passthroughCSS('background:linear-gradient(to bottom left,#ffe500,#121)')
  );
});

describe('Color stop fixup and length reduction', () => {
  test(
    'repeating-linear: should reduce a double-position stop fixed up to the preceding position',
    processCSS(
      'background:repeating-linear-gradient(-45deg,transparent 0 25%,#d1d3d5 25% 50%)',
      'background:repeating-linear-gradient(-45deg,transparent 0 25%,#d1d3d5 0 50%)'
    )
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
    'linear: should not compare positions after a non-literal position',
    passthroughCSS(
      'background:linear-gradient(red 50%,blue calc(40%),green 45%)'
    )
  );

  test(
    'linear: should continue comparing literal positions after a non-literal position',
    processCSS(
      'background:linear-gradient(red calc(40%),blue 50%,green 40%)',
      'background:linear-gradient(red calc(40%),blue 50%,green 0)'
    )
  );

  test(
    'linear: should not compare positions when a double-position stop is non-literal',
    passthroughCSS('background:linear-gradient(red 50% calc(40%),blue 45%)')
  );

  test(
    'linear: should remove the (unnecessary) start/end length values',
    processCSS(
      'background:linear-gradient(#ffe500 0%,#121 100%)',
      'background:linear-gradient(#ffe500,#121)'
    )
  );

  test(
    'linear: should remove an end position after fixing it up to the preceding position',
    processCSS(
      'background:linear-gradient(red 100%,blue 100%)',
      'background:linear-gradient(red 100%,blue)'
    )
  );

  test(
    'linear: should correctly minimize multiple stops without position',
    processCSS(
      'border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.15), #FFFAB8 0%, #D39710 100%)',
      'border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.15), #FFFAB8 0, #D39710)'
    )
  );

  test(
    'linear: should use the largest preceding position when fixing up color stops',
    processCSS(
      'background:linear-gradient(red 50%,blue 40%,green 45%)',
      'background:linear-gradient(red 50%,blue 0,green 0)'
    )
  );

  test(
    'linear: should fix up transition hints',
    processCSS(
      'background:linear-gradient(red 50%,40%,blue 45%)',
      'background:linear-gradient(red 50%,0,blue 0)'
    )
  );

  test(
    'conic: should apply color stop fixup to angular positions',
    processCSS(
      'background:conic-gradient(from 20deg at center,red 50deg,blue 40deg,green 45deg)',
      'background:conic-gradient(from 20deg at center,red 50deg,blue 0,green 0)'
    )
  );
});

describe('Floating points and empty linear gradients', () => {
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
});
