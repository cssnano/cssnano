'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');
const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should minify lowercase color values',
  processCSS('h1{color:yellow}', 'h1{color:#ff0}')
);

test(
  'should minify uppercase color values',
  processCSS('h1{COLOR:YELLOW}', 'h1{COLOR:#ff0}')
);

test(
  'should minify color values (2)',
  processCSS(
    'h1{box-shadow:0 1px 3px rgba(255, 230, 220, 0.5)}',
    'h1{box-shadow:0 1px 3px rgba(255,230,220,.5)}'
  )
);

test(
  'should minify color values (3)',
  processCSS('h1{background:hsla(134, 50%, 50%, 1)}', 'h1{background:#40bf5e}')
);

test(
  'should minify color values (4)',
  processCSS(
    'h1{text-shadow:1px 1px 2px #000000}',
    'h1{text-shadow:1px 1px 2px #000}'
  )
);

test(
  'should minify color values (5)',
  processCSS(
    'h1{text-shadow:1px 1px 2px rgb(255, 255, 255)}',
    'h1{text-shadow:1px 1px 2px #fff}'
  )
);

test(
  'should minify color values (6)',
  processCSS(
    'h1{text-shadow:1px 1px 2px hsl(0,0%,100%)}',
    'h1{text-shadow:1px 1px 2px #fff}'
  )
);

test(
  'should minify color values (7)',
  processCSS('h1{background:HSLA(134, 50%, 50%, 1)}', 'h1{background:#40bf5e}')
);

test(
  'should minify color values (8)',
  processCSS('h1{background:#FFFFFF}', 'h1{background:#fff}')
);

test(
  'should minify color values (9)',
  processCSS('h1{background:#F0FFFF}', 'h1{background:azure}')
);

test(
  'should minify color values (11)',
  processCSS(
    'h1{background:#F0FFFF;background:#F0FFFF}',
    'h1{background:azure;background:azure}'
  )
);

test(
  'should minify color values in background gradients',
  processCSS(
    'h1{background:linear-gradient( #ff0000,yellow )}',
    'h1{background:linear-gradient( red,#ff0 )}'
  )
);

test(
  'should minify color values in background gradients (2)',
  processCSS(
    'h1{background:linear-gradient(yellow, orange), linear-gradient(black, rgba(255, 255, 255, 0))}',
    'h1{background:linear-gradient(#ff0, orange), linear-gradient(#000, hsla(0,0%,100%,0))}'
  )
);

test(
  'should minify color values in background gradients (3)',
  processCSS(
    'h1{background:linear-gradient(0deg, yellow, black 40%, red)}',
    'h1{background:linear-gradient(0deg, #ff0, #000 40%, red)}'
  )
);

test(
  'should not minify in font properties',
  passthroughCSS('h1{font-family:black}')
);

test(
  'should make an exception for webkit tap highlight color (issue 1)',
  passthroughCSS('h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}')
);

test(
  'should not crash on transparent in webkit tap highlight color',
  passthroughCSS('h1{-webkit-tap-highlight-color:transparent}')
);

test(
  'should not crash on inherit in webkit tap highlight color',
  passthroughCSS('h1{-webkit-tap-highlight-color:inherit}')
);

test(
  'should minify color stops',
  processCSS(
    'h1{background-image:-webkit-gradient(linear,50% 0%,50% 100%,color-stop(1px, #fbfbfb),color-stop(1px, #ffffff),color-stop(2px, #ffffff),color-stop(2px, #fbfbfb),color-stop(100%, #ececec))}',
    'h1{background-image:-webkit-gradient(linear,50% 0%,50% 100%,color-stop(1px, #fbfbfb),color-stop(1px, #fff),color-stop(2px, #fff),color-stop(2px, #fbfbfb),color-stop(100%, #ececec))}'
  )
);

test(
  'should not minify in lowercase calc values',
  passthroughCSS('h1{width:calc(100vw / 2 - 6px + 0)}')
);

test(
  'should not minify in uppercase calc values',
  passthroughCSS('h1{width:CALC(100vw / 2 - 6px + 0)}')
);

test(
  'should minify hex colors without keywords',
  processCSS(
    'h1{background:linear-gradient(#ffffff,#999999) no-repeat;}',
    'h1{background:linear-gradient(#fff,#999) no-repeat;}'
  )
);

test(
  'should not mangle percentage based rgba values',
  processCSS(
    'h1{color:rgba(50%, 50%, 50%, 0.5)}',
    'h1{color:hsla(0,0%,50%,.5)}'
  )
);

test(
  'should convert percentage based rgba values',
  processCSS('h1{color:rgb(100%,100%,100%)}', 'h1{color:#fff}')
);

test(
  'should handle errored cases',
  passthroughCSS('h1{color:rgb(50%, 23, 54)}')
);

test(
  'should add extra spaces when converting rgb',
  processCSS(
    'h1{background:linear-gradient(rgb(50, 50, 50)0%,blue 100%)}',
    'h1{background:linear-gradient(#323232 0%,blue 100%)}'
  )
);

test(
  'should add extra spaces when converting rgb (2)',
  processCSS(
    'h1{background:linear-gradient(rgba(0,0,0,0)0%, blue 100%)}',
    'h1{background:linear-gradient(transparent 0%, blue 100%)}'
  )
);

test(
  'should add extra spaces when converting rgb (3)',
  processCSS(
    'h1{background:rgb(1,2,3)url(bar.png)}',
    'h1{background:#010203 url(bar.png)}'
  )
);

test(
  'should save extra spaces when converting hex',
  processCSS(
    'h1{background:#F0FFFF url(bar.png)}',
    'h1{background:azure url(bar.png)}'
  )
);

test(
  'should passthrough css variables named as a color',
  passthroughCSS('h1{color:var(--white)}')
);

test('should passthrough broken syntax', passthroughCSS('h1{color:}'));

test(
  'should not convert this specific rgba value to "transparent" (old IE)',
  passthroughCSS('h1{color:rgba(0,0,0,0)}', { env: 'ie8' })
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'should not mangle colours in the content property',
  passthroughCSS('h2:before{content:"black"}')
);

test(
  'should not attempt to convert z-index',
  passthroughCSS('h1{z-index:999}')
);

test(
  'should not attempt to convert variables',
  passthroughCSS(':root{--some-color: 200 255 0}')
);

test(
  'should respect CSS variables',
  passthroughCSS('div{background-color:rgba(51,153,255,var(--tw-bg-opacity))}')
);

test(
  'should convert long color to 8-digit hex when supported',
  processCSS('h1{color:rgba(100% 50% 0% / 50%)}', 'h1{color:#ff800080}', {
    env: 'chrome62',
  })
);

test(
  'should convert long color to 4-digit hex when supported',
  processCSS('h1{color:hsla(0 100% 50% / 40%)}', 'h1{color:#f006}', {
    env: 'chrome62',
  })
);
test.run();
