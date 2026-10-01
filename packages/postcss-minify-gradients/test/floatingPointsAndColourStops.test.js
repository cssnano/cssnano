import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
