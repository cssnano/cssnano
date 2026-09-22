import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Fractions and trailing/leading zeros', () => {
  test(
    'should trim trailing zeros',
    processCSS('h1{width:109.00000000000px}', 'h1{width:109px}')
  );

  test(
    'should trim trailing zeros + unit',
    processCSS('h1{width:0.00px}', 'h1{width:0}')
  );

  test(
    'should trim trailing zeros without unit',
    processCSS('h1{width:100.00%}', 'h1{width:100%}')
  );

  test(
    'should optimise fractions',
    processCSS('h1{opacity:1.}h2{opacity:.0}', 'h1{opacity:1}h2{opacity:0}')
  );

  test(
    'should optimise fractions with units',
    processCSS('h1{width:10.px}h2{width:.0px}', 'h1{width:10px}h2{width:0}')
  );

  test(
    'should optimise fractions inside calc',
    processCSS('h1{width:calc(10.px + .0px)}', 'h1{width:calc(10px + 0px)}')
  );

  test(
    'should handle leading zero in rem values',
    processCSS('.one{top:0.25rem}', '.one{top:.25rem}')
  );

  test(
    'should handle slash separated values',
    processCSS(
      '.one{background: 50% .0%/100.0% 100.0%}',
      '.one{background: 50% 0/100% 100%}'
    )
  );

  test(
    'should handle comma separated values',
    processCSS(
      '.one{background: 50% .0% ,100.0% 100.0%}',
      '.one{background: 50% 0 ,100% 100%}'
    )
  );

  test(
    'should trim leading zeroes from negative values',
    processCSS('h1,h2{letter-spacing:-0.1rem}', 'h1,h2{letter-spacing:-.1rem}')
  );
});

describe('Precision and rounding', () => {
  test(
    'should round pixel values to two decimal places',
    processCSS('h1{right:6.66667px}', 'h1{right:6.67px}', { precision: 2 })
  );

  test(
    'should round pixel values with customisable precision',
    processCSS('h1{right:6.66667px}', 'h1{right:7px}', { precision: 0 })
  );

  test(
    'should not round pixel values to two decimal places by default',
    passthroughCSS('h1{right:6.66667px}')
  );

  test(
    'should convert pixel values to shorter units correctly when precision is configured',
    processCSS('h1{width:96.0px}', 'h1{width:1in}', { precision: 2 })
  );
});

describe('Opacity clamping and stripping', () => {
  test(
    'should preserve opacities defined as percentages',
    passthroughCSS('h1{opacity:100%}')
  );

  test(
    'should remove unit from opacity: 0%',
    processCSS('h1{opacity:0%}', 'h1{opacity:0}')
  );

  test(
    'should clamp opacity to 1 maximum',
    processCSS(
      'h1{opacity:150;opacity:15;opacity:1.5}',
      'h1{opacity:1;opacity:1;opacity:1}'
    )
  );

  test(
    'should clamp opacity to 0 minimum',
    processCSS(
      'h1{opacity:-0.5;opacity:-5;opacity:-50}',
      'h1{opacity:0;opacity:0;opacity:0}'
    )
  );

  test(
    'should not clamp numeric values nested in opacity functions',
    passthroughCSS('h1{opacity:calc(var(--foo)*5)}')
  );

  test(
    'should keep stripping zeroes from opacity',
    processCSS('h1{opacity:0.0625}', 'h1{opacity:.0625}')
  );

  test(
    'should keep stripping zeroes from opacity (2)',
    processCSS('h1{OPACITY:0.0625}', 'h1{OPACITY:.0625}')
  );

  test(
    'should handle global values for opacity',
    passthroughCSS('h1{opacity:initial}')
  );
});

describe('Shape-image-threshold and SVG opacity clamping', () => {
  test(
    'should clamp shape-image-threshold to 1 maximum',
    processCSS(
      'h1{shape-image-threshold:150;shape-image-threshold:15;shape-image-threshold:1.5}',
      'h1{shape-image-threshold:1;shape-image-threshold:1;shape-image-threshold:1}'
    )
  );

  test(
    'should clamp shape-image-threshold to 1 maximum (2)',
    processCSS(
      'h1{SHAPE-IMAGE-THRESHOLD:150;SHAPE-IMAGE-THRESHOLD:15;SHAPE-IMAGE-THRESHOLD:1.5}',
      'h1{SHAPE-IMAGE-THRESHOLD:1;SHAPE-IMAGE-THRESHOLD:1;SHAPE-IMAGE-THRESHOLD:1}'
    )
  );

  test(
    'should clamp shape-image-threshold to 0 minimum',
    processCSS(
      'h1{shape-image-threshold:-0.5;shape-image-threshold:-5;shape-image-threshold:-50}',
      'h1{shape-image-threshold:0;shape-image-threshold:0;shape-image-threshold:0}'
    )
  );

  test(
    'should handle global values for shape-image-threshold',
    passthroughCSS('h1{shape-image-threshold:initial}')
  );

  test(
    'should keep stripping zeroes from shape-image-threshold',
    processCSS(
      'h1{shape-image-threshold:0.0625}',
      'h1{shape-image-threshold:.0625}'
    )
  );

  test(
    'should clamp fill-opacity to 1 maximum',
    processCSS(
      'svg{fill-opacity:150;fill-opacity:15;fill-opacity:1.5}',
      'svg{fill-opacity:1;fill-opacity:1;fill-opacity:1}'
    )
  );

  test(
    'should clamp fill-opacity to 0 minimum',
    processCSS(
      'svg{fill-opacity:-0.5;fill-opacity:-5;fill-opacity:-50}',
      'svg{fill-opacity:0;fill-opacity:0;fill-opacity:0}'
    )
  );

  test(
    'should clamp stroke-opacity to 1 maximum',
    processCSS(
      'svg{stroke-opacity:150;stroke-opacity:15;stroke-opacity:1.5}',
      'svg{stroke-opacity:1;stroke-opacity:1;stroke-opacity:1}'
    )
  );

  test(
    'should clamp stroke-opacity to 0 minimum',
    processCSS(
      'svg{stroke-opacity:-0.5;stroke-opacity:-5;stroke-opacity:-50}',
      'svg{stroke-opacity:0;stroke-opacity:0;stroke-opacity:0}'
    )
  );

  test(
    'should clamp stop-opacity to 1 maximum',
    processCSS(
      'stop{stop-opacity:150;stop-opacity:15;stop-opacity:1.5}',
      'stop{stop-opacity:1;stop-opacity:1;stop-opacity:1}'
    )
  );

  test(
    'should clamp stop-opacity to 0 minimum',
    processCSS(
      'stop{stop-opacity:-0.5;stop-opacity:-5;stop-opacity:-50}',
      'stop{stop-opacity:0;stop-opacity:0;stop-opacity:0}'
    )
  );
});
