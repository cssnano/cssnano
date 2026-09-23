import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('hwb() and wide gamut color formats', () => {
  test(
    'should minify hwb(120 0% 0%) to #0f0',
    processCSS('h1{color:hwb(120 0% 0%)}', 'h1{color:#0f0}')
  );

  test(
    'should minify hwb() with slash alpha',
    processCSS('h1{color:hwb(120 0% 0% / 0.5)}', 'h1{color:rgba(0,255,0,.5)}')
  );

  test(
    'should minify hwb() with a degree angle and opaque slash alpha',
    processCSS('h1{color:hwb(120deg 0% 0% / 1)}', 'h1{color:#0f0}')
  );

  test(
    'should minify hwb() with a turn angle',
    processCSS('h1{color:hwb(0.3333turn 0% 0%)}', 'h1{color:#0f0}')
  );

  test(
    'should minify colors in border-image-source gradients',
    processCSS(
      'h1{border-image-source:linear-gradient(white,yellow)}',
      'h1{border-image-source:linear-gradient(#fff,#ff0)}'
    )
  );

  test(
    'should pass through oklch() wide gamut format untouched',
    passthroughCSS('h1{color:oklch(0.6279 0.2577 29.23)}')
  );

  test(
    'should pass through oklab() wide gamut format untouched',
    passthroughCSS('h1{color:oklab(0.5 0.1 -0.2)}')
  );

  test(
    'should pass through color() wide gamut format untouched',
    passthroughCSS('h1{color:color(display-p3 1 0.5 0)}')
  );
});
