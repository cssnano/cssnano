import nodepath from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { join } = nodepath;
const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Flex properties and unitless zeroes', () => {
  test('should not mangle flex basis', passthroughCSS('h1{flex-basis:0%}'));

  test('should not mangle flex basis (2)', passthroughCSS('h1{FLEX-BASIC:0%}'));

  test(
    'should retain IE flex-order declaration and not convert unitless zero',
    passthroughCSS('a{-ms-flex-order:5;-ms-flex-order:0px}')
  );

  test(
    'should not mangle -webkit-flex-basis',
    passthroughCSS('h1{-webkit-flex-basis:0%}')
  );

  test(
    'should not mangle -moz-flex-basis',
    passthroughCSS('h1{-moz-flex-basis:0%}')
  );

  test('should not mangle -moz-flex', passthroughCSS('h1{-moz-flex:1 1 0%}'));

  test(
    'should not mangle -ms-flex-preferred-size',
    passthroughCSS('h1{-ms-flex-preferred-size:0%}')
  );

  test(
    'should not mangle values without units',
    passthroughCSS('h1{z-index:5}')
  );

  test(
    'should convert dimensions in flex-basis when non-zero',
    processCSS('h1{flex-basis:192px}', 'h1{flex-basis:2in}')
  );

  test(
    'should format numbers in flex-grow and flex-shrink',
    processCSS(
      'h1{flex-grow:1.0;flex-shrink:2.0}',
      'h1{flex-grow:1;flex-shrink:2}'
    )
  );

  test(
    'should optimize flex shorthand numbers and percentages while preserving zero units',
    processCSS(
      'h1{flex:1.0 1.0 100.00%;h2{flex:1 1 0px};h3{flex:1 1 0%}}',
      'h1{flex:1 1 100%;h2{flex:1 1 0px};h3{flex:1 1 0%}}'
    )
  );

  test(
    'should preserve 0px in flex-basis',
    passthroughCSS('h1{flex-basis:0px}')
  );
});

describe('Height, min-width, and Browserslist zero-percentage', () => {
  test(
    'should strip trailing zeroes from percentage heights',
    processCSS('h1{height:12.500%}', 'h1{height:12.5%}')
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}')
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [legacy] env',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [legacy] env using webpack file path',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [legacy] env using custom path',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      path: join(testDir, 'browserslist'),
      env: 'legacy',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props for IE 10 target',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      overrideBrowserslist: 'ie 10',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props for IE 9 target',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      overrideBrowserslist: 'ie 9',
    })
  );

  test(
    'should strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [modern] env',
    processCSS(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0;max-height:0;min-width:0}',
      {
        from: join(testDir, 'browserslist/example.css'),
        env: 'modern',
      }
    )
  );

  test(
    'should strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [modern] env using webpack file path',
    processCSS(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0;max-height:0;min-width:0}',
      {
        file: join(testDir, 'browserslist/example.css'),
        env: 'modern',
      }
    )
  );

  test(
    'should strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [modern] env using custom path',
    processCSS(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0;max-height:0;min-width:0}',
      {
        path: join(testDir, 'browserslist'),
        env: 'modern',
      }
    )
  );

  test('should cache browserslist determination across multiple process calls', async () => {
    const instance = plugin({ overrideBrowserslist: 'ie 11' });
    const { processCSS: run } = processCSSFactory([instance]);
    await run(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0%;max-height:0%;min-width:0%}'
    )();
    await run(
      'h2{height:0%;max-height:0%;min-width:0%}',
      'h2{height:0%;max-height:0%;min-width:0%}'
    )();
  });

  test(
    'should strip the unit from 0 in max-height & height props',
    processCSS('h1{height:0em;max-height:0em}', 'h1{height:0;max-height:0}')
  );

  test(
    'should strip the unit from 0 in max-height & height props (2)',
    processCSS('h1{height:0em;MAX-HEIGHT:0em}', 'h1{height:0;MAX-HEIGHT:0}')
  );

  test(
    'should strip unit from zero length even when comments contain percentage',
    processCSS(
      'h1{height:0px /* 100% */};h2{max-height:0px /* 50% */}',
      'h1{height:0 /* 100% */};h2{max-height:0 /* 50% */}'
    )
  );
});

describe('Animations and font-face', () => {
  test(
    'should not try to convert keyframe names in animation',
    passthroughCSS(
      'h1{ -webkit-animation: e836684w2 } h2{ animation: e836684w2 }'
    )
  );

  test(
    'should not try to convert keyframe names in animation (case 2)',
    passthroughCSS(`
.e4yw0Q {
    animation: e4yw0Q;
}

@keyframes e4yw0Q {}
    `)
  );

  for (const property of [
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
  ]) {
    test(
      `should not strip the percentage from 0 in SVG animation, for IE (${property})`,
      passthroughCSS(`@keyframes a{0%{${property}:200%}to{${property}:0%}}`)
    );
  }

  for (const property of [
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
  ]) {
    test(
      `should not strip percentage from 0 in SVG transitions outside keyframes (${property})`,
      passthroughCSS(`.bar{${property}:0%;transition:${property} 1s}`)
    );
  }

  for (const property of [
    'STROKE-DASHARRAY',
    'STROKE-DASHOFFSET',
    'STROKE-WIDTH',
  ]) {
    test(
      `should not strip the percentage from 0 in SVG animation, for IE (${property}) (2)`,
      passthroughCSS(`@KEYFRAMES a{0%{${property}:200%}to{${property}:0%}}`)
    );
  }

  test(
    'should not convert ascent and descent-override',
    passthroughCSS(
      '@font-face {descent-override:0%;ascent-override:0%;line-gap-override:0%;size-adjust:0%;font-stretch:0%}'
    )
  );

  test(
    'should not convert CSS Fonts 5 override descriptors zero percentages',
    passthroughCSS(
      '@font-face {subscript-position-override:0%;superscript-position-override:0%;subscript-size-override:0%;superscript-size-override:0%}'
    )
  );

  test(
    'should not convert text-size-adjust and font-width zero percentages',
    passthroughCSS(
      '@font-face {font-width:0%} html{text-size-adjust:0%;-webkit-text-size-adjust:0%;-moz-text-size-adjust:0%;-ms-text-size-adjust:0%}'
    )
  );

  test(
    'should simplify non-zero percentages in override descriptors and text-size-adjust',
    processCSS(
      '@font-face {size-adjust:100.0%;font-width:100.0%;descent-override:80.0%;subscript-position-override:50.0%} html{text-size-adjust:100.0%}',
      '@font-face {size-adjust:100%;font-width:100%;descent-override:80%;subscript-position-override:50%} html{text-size-adjust:100%}'
    )
  );

  test(
    'should strip length zero from border-image-width inside keyframes',
    processCSS(
      '@keyframes test {0% {border-image-width: 0px 0px 100% 0%;}}',
      '@keyframes test {0% {border-image-width: 0 0 100% 0%;}}'
    )
  );

  test(
    'should preserve keyframe zero percentages under CSS nesting',
    passthroughCSS(
      '@keyframes spin { from { & { stroke-dasharray: 0%; stroke-dashoffset: 0%; stroke-width: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under deep CSS nesting',
    passthroughCSS(
      '@keyframes spin { from { & { div { stroke-dasharray: 0%; } } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @supports',
    passthroughCSS(
      '@keyframes spin { from { @supports (display: flex) { stroke-dasharray: 0%; stroke-dashoffset: 0%; stroke-width: 0%; border-image-width: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @media',
    passthroughCSS(
      '@keyframes spin { from { @media (min-width: 0px) { stroke-dasharray: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @layer',
    passthroughCSS(
      '@keyframes spin { from { @layer base { stroke-dasharray: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @scope',
    passthroughCSS(
      '@keyframes spin { from { @scope (.foo) { stroke-dasharray: 0%; } } }'
    )
  );

  test(
    'should not clamp opacity greater than 1 inside keyframes',
    passthroughCSS('@keyframes bounce { 50% { opacity: 1.2; } }')
  );

  test(
    'should not clamp opacity less than 0 inside keyframes',
    processCSS(
      '@keyframes bounce { 50% { opacity: -0.2; } }',
      '@keyframes bounce { 50% { opacity: -.2; } }'
    )
  );

  test(
    'should not clamp fill-opacity greater than 1 inside keyframes',
    passthroughCSS('@keyframes bounce { 50% { fill-opacity: 1.5; } }')
  );

  test(
    'should not clamp opacity in nested keyframes under CSS nesting and @supports',
    passthroughCSS(
      '@keyframes bounce { from { @supports (display: flex) { opacity: 1.2; } } }'
    )
  );

  test(
    'should not clamp opacity in @-webkit-keyframes',
    passthroughCSS('@-webkit-keyframes bounce { 50% { opacity: 1.2; } }')
  );
});

describe('Non-strip percentage properties', () => {
  test(
    'should not strip the percentage from background-color',
    passthroughCSS('background-color:color-mix(#000, #FFF 0%);')
  );

  test(
    'should not strip the percentage from box-shadow',
    passthroughCSS('box-shadow:inset 0 0 0 250pc hsla(0,0%,100%,.7215686275)')
  );

  test(
    'should not strip the percentage from linear()',
    passthroughCSS('transition-timing-function: linear(0 0%, 1 100%)')
  );

  test(
    'should not strip percentage from border-image-width',
    passthroughCSS('@keyframes test {0% {border-image-width: 0 0 100% 0%;}}')
  );

  test(
    'should not strip the percentage from conic-gradient',
    passthroughCSS('background:conic-gradient(red 0%, blue 100%)')
  );

  test(
    'should not strip the percentage from repeating-conic-gradient',
    passthroughCSS('background:repeating-conic-gradient(red 0%, blue 50%)')
  );

  test(
    'should not strip the percentage from cross-fade',
    passthroughCSS(
      'background-image:cross-fade(url(a.png) 0%, url(b.png) 100%)'
    )
  );

  test(
    'should not strip percentage from zero in comma-form rgb()',
    passthroughCSS('color:rgb(100%, 0%, 50%)')
  );

  test(
    'should not strip percentage from zero in comma-form rgba()',
    processCSS(
      'color:rgba(100%, 0%, 50%, 0.5)',
      'color:rgba(100%, 0%, 50%, .5)'
    )
  );

  test(
    'should not strip percentage from pure percentage rgb()',
    passthroughCSS('color:rgb(0%, 0%, 0%)')
  );

  test(
    'should preserve pure numeric rgb() without units',
    passthroughCSS('color:rgb(0, 0, 0)')
  );

  test(
    'should not strip percentage from border-image-width and stroke-dasharray in @-webkit-keyframes',
    passthroughCSS(
      '@-webkit-keyframes test {0% {border-image-width: 0 0 100% 0%;stroke-dasharray: 0%;}}'
    )
  );

  test(
    'should not strip zero percentage from modern color functions',
    passthroughCSS(
      'h1{color:oklch(0% 0 0);color:oklab(0% 0 0);color:lab(0% 0 0);color:lch(0% 0 0);color:color(display-p3 0% 0% 0%)}'
    )
  );

  test(
    'should not strip the percentage from palette-mix()',
    passthroughCSS(
      'font-palette:palette-mix(in oklch, var(--p1) 0%, var(--p2))'
    )
  );

  test(
    'should not strip the percentage from hwb()',
    passthroughCSS('color:hwb(0deg 0% 0%)')
  );

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
});
