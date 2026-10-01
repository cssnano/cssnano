import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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
