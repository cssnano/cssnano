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
    'should ignore negative precision and treat as default',
    passthroughCSS('h1{right:6.66667px}', { precision: -1 })
  );

  test(
    'should ignore negative precision and treat as default (case 2)',
    passthroughCSS('h1{right:6.66667px}', { precision: -5 })
  );

  test(
    'should convert pixel values to shorter units correctly when precision is configured',
    processCSS('h1{width:96.0px}', 'h1{width:1in}', { precision: 2 })
  );

  test(
    'should round non-px values with customisable precision',
    processCSS(
      'h1{width:1.2345rem;height:1.2345em;top:1.2345%;bottom:1.2345vh}',
      'h1{width:1.23rem;height:1.23em;top:1.23%;bottom:1.23vh}',
      { precision: 2 }
    )
  );

  test(
    'should round half values accurately without IEEE-754 precision loss',
    processCSS(
      'h1{width:1.005px;height:10.005px}',
      'h1{width:1.01px;height:10.01px}',
      { precision: 2 }
    )
  );

  test(
    'should round negative half values symmetrically away from zero',
    processCSS(
      'h1{margin:-1.005px;top:-10.005px;left:-6.6667px}',
      'h1{margin:-1.01px;top:-10.01px;left:-6.67px}',
      { precision: 2 }
    )
  );

  test(
    'should round scientific notation without decimal dot according to precision',
    processCSS('h1{width:1e-2px}', 'h1{width:0}', { precision: 1 })
  );

  test(
    'should round scientific notation without decimal dot when precision preserves fraction',
    processCSS('h1{width:1e-2px}', 'h1{width:.01px}', { precision: 2 })
  );

  test(
    'should eliminate floating-point noise during unit conversion',
    processCSS(
      'h1{transition-duration:100.00000000000002ms}',
      'h1{transition-duration:.1s}'
    )
  );
});

describe('Opacity clamping and stripping', () => {
  test(
    'should convert opacity 100% to 1 and clamp percentages',
    processCSS(
      'h1{opacity:100%;opacity:150%;opacity:-50%}',
      'h1{opacity:1;opacity:1;opacity:0}'
    )
  );

  test(
    'should simplify opacity percentages to shorter decimals',
    processCSS(
      'h1{opacity:50%;opacity:10%;opacity:20%}',
      'h1{opacity:.5;opacity:.1;opacity:.2}'
    )
  );

  test(
    'should preserve percentage opacities when decimal is not strictly shorter',
    passthroughCSS('h1{opacity:25%;opacity:75%;opacity:33%}')
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
    'should clamp opacity for single-digit values greater than 1',
    processCSS(
      'h1{opacity:2;opacity:3;opacity:5;opacity:9;fill-opacity:2;-webkit-opacity:5;shape-image-threshold:2}',
      'h1{opacity:1;opacity:1;opacity:1;opacity:1;fill-opacity:1;-webkit-opacity:1;shape-image-threshold:1}'
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

  test(
    'should respect precision option when converting percentage opacity to decimal',
    processCSS('h1{opacity:50.5%}', 'h1{opacity:.5}', { precision: 1 })
  );

  test(
    'should respect precision option on fill-opacity percentage',
    processCSS('h1{fill-opacity:25.5%}', 'h1{fill-opacity:.3}', {
      precision: 1,
    })
  );

  test(
    'should respect precision option on shape-image-threshold percentage',
    processCSS(
      'h1{shape-image-threshold:33.33%}',
      'h1{shape-image-threshold:.3}',
      { precision: 1 }
    )
  );

  test(
    'should respect precision option with two decimal places on percentage opacity',
    processCSS('h1{opacity:50.55%}', 'h1{opacity:.51}', { precision: 2 })
  );

  test(
    'should respect precision option on vendor-prefixed opacity percentages',
    processCSS('h1{-webkit-opacity:50.5%}', 'h1{-webkit-opacity:.5}', {
      precision: 1,
    })
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

  test(
    'should clamp flood-opacity',
    processCSS(
      'filter{flood-opacity:150;flood-opacity:1.5;flood-opacity:150%;flood-opacity:-0.5;flood-opacity:-50%}',
      'filter{flood-opacity:1;flood-opacity:1;flood-opacity:1;flood-opacity:0;flood-opacity:0}'
    )
  );

  test(
    'should clamp -webkit-opacity',
    processCSS(
      'h1{-webkit-opacity:150;-webkit-opacity:1.5;-webkit-opacity:150%;-webkit-opacity:-0.5;-webkit-opacity:-50%}',
      'h1{-webkit-opacity:1;-webkit-opacity:1;-webkit-opacity:1;-webkit-opacity:0;-webkit-opacity:0}'
    )
  );

  test(
    'should simplify SVG and prefixed opacity percentages to shorter decimals',
    processCSS(
      'h1{fill-opacity:50%;stroke-opacity:10%;-webkit-opacity:50%;shape-image-threshold:20%}',
      'h1{fill-opacity:.5;stroke-opacity:.1;-webkit-opacity:.5;shape-image-threshold:.2}'
    )
  );

  test(
    'should round scientific notation values according to precision option',
    processCSS(
      'h1{width:1.2345e2px;height:1.23456e2px}',
      'h1{width:123.45px;height:123.46px}',
      { precision: 2 }
    )
  );
});
