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
    'should not mangle -ms-flex-preferred-size',
    passthroughCSS('h1{-ms-flex-preferred-size:0%}')
  );

  test(
    'should not mangle values without units',
    passthroughCSS('h1{z-index:5}')
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

  test(
    'should strip the unit from 0 in max-height & height props',
    processCSS('h1{height:0em;max-height:0em}', 'h1{height:0;max-height:0}')
  );

  test(
    'should strip the unit from 0 in max-height & height props (2)',
    processCSS('h1{height:0em;MAX-HEIGHT:0em}', 'h1{height:0;MAX-HEIGHT:0}')
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

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
});
