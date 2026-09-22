import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should not recognize a Unicode lookalike gradient function',
  passthroughCSS('background:linear-gradiеnt(red,blue)')
);

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

  test(
    'linear: should treat currentColor as the first color stop when removing the start position',
    processCSS(
      'background:linear-gradient(currentColor 10%,red 0%,#fff 100%)',
      'background:linear-gradient(currentColor 10%,red 0,#fff)'
    )
  );

  test(
    'linear: should treat currentColor as the last color stop when removing the end position',
    processCSS(
      'background:linear-gradient(red 0%,blue 100%,currentColor 60%)',
      'background:linear-gradient(red,blue 100%,currentColor 0)'
    )
  );

  test(
    'linear: should fix up positions after a currentColor stop',
    processCSS(
      'background:linear-gradient(currentColor 50%,red 40%,blue 45%)',
      'background:linear-gradient(currentColor 50%,red 0,blue 0)'
    )
  );

  test(
    'linear: should not replace positions with zero when the largest position is negative',
    passthroughCSS('background:linear-gradient(red -5%,blue -5%)')
  );

  test(
    'linear: should remove the start position of a single-stop gradient',
    processCSS(
      'background:linear-gradient(red 0%)',
      'background:linear-gradient(red)'
    )
  );

  test(
    'linear: should remove the end position of a single-stop gradient',
    processCSS(
      'background:linear-gradient(red 100%)',
      'background:linear-gradient(red)'
    )
  );

  test(
    'linear: should keep editing sibling gradients when one gradient has a single stop',
    processCSS(
      'background:linear-gradient(red 0%,currentColor),linear-gradient(to top,red,blue)',
      'background:linear-gradient(red,currentColor),linear-gradient(0deg,red,blue)'
    )
  );

  test(
    'linear: should not replace an angle position zero with a unitless zero',
    passthroughCSS('background:linear-gradient(red 10%,blue 0turn)')
  );

  test(
    'conic: should clamp a zero position to a non-negative maximum in another unit',
    processCSS(
      'background:conic-gradient(red 10deg,blue 0%)',
      'background:conic-gradient(red 10deg,blue 0)'
    )
  );

  test(
    'conic: should clamp later zero positions after a zero spelling took the maximum',
    processCSS(
      'background:conic-gradient(red 10deg,blue 0%,green 0px)',
      'background:conic-gradient(red 10deg,blue 0,green 0)'
    )
  );

  test(
    'conic: should not change an already clamped gradient when minified again',
    passthroughCSS('background:conic-gradient(red 10deg,blue 0,green 0)')
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

describe('Colour stop syntaxes recognised when fixing up positions', () => {
  test(
    'should fix up positions after a wide-gamut color() stop',
    processCSS(
      'background:linear-gradient(color(display-p3 1 0 0) 50%,blue 45%)',
      'background:linear-gradient(color(display-p3 1 0 0) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a device-cmyk() stop',
    processCSS(
      'background:linear-gradient(device-cmyk(0 81% 81% 30%) 50%,blue 45%)',
      'background:linear-gradient(device-cmyk(0 81% 81% 30%) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a relative colour syntax stop',
    processCSS(
      'background:linear-gradient(rgb(from red r g b / 0.5) 50%,blue 45%)',
      'background:linear-gradient(rgb(from red r g b / 0.5) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a color-mix() stop',
    processCSS(
      'background:linear-gradient(color-mix(in srgb, red, blue) 50%,blue 45%)',
      'background:linear-gradient(color-mix(in srgb, red, blue) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a light-dark() stop',
    processCSS(
      'background:linear-gradient(light-dark(red, blue) 50%,blue 45%)',
      'background:linear-gradient(light-dark(red, blue) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a contrast-color() stop',
    processCSS(
      'background:linear-gradient(contrast-color(red) 50%,blue 45%)',
      'background:linear-gradient(contrast-color(red) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a lab() stop',
    processCSS(
      'background:linear-gradient(lab(50% 20 30) 50%,blue 45%)',
      'background:linear-gradient(lab(50% 20 30) 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a system colour stop',
    processCSS(
      'background:linear-gradient(CanvasText 50%,blue 45%)',
      'background:linear-gradient(CanvasText 50%,blue 0)'
    )
  );

  test(
    'should fix up positions after a modern hsl() stop',
    processCSS(
      'background:linear-gradient(hsl(120deg 50% 50%) 50%,blue 45%)',
      'background:linear-gradient(hsl(120deg 50% 50%) 50%,blue 0)'
    )
  );

  test(
    'should keep the clamped position of every colour stop syntax on re-minification',
    passthroughCSS(
      'background:linear-gradient(color(display-p3 1 0 0) 50%,blue 0)'
    )
  );
});
