'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should convert milliseconds to seconds',
  processCSS('h1{transition-duration:500ms}', 'h1{transition-duration:.5s}')
);

test(
  'should convert seconds to milliseconds',
  processCSS('h1{transition-duration:.005s}', 'h1{transition-duration:5ms}')
);

test(
  'should not convert negative milliseconds to seconds',
  passthroughCSS('h1{animation-duration:-569ms}')
);

test(
  'should not remove the unit from zero values (duration)',
  passthroughCSS('h1{transition-duration:0s}')
);

test(
  'should not remove the unit from zero values (custom properties)',
  passthroughCSS('h1{--my-variable:0px}')
);

test(
  'should remove unnecessary plus signs',
  processCSS('h1{width:+14px}', 'h1{width:14px}')
);

test('should convert px to pc', processCSS('h1{width:16px}', 'h1{width:1pc}'));

test(
  'should convert px to pt',
  processCSS('h1{width:120px}', 'h1{width:90pt}')
);

test('should convert px to in', processCSS('h1{width:192px}', 'h1{width:2in}'));

test('should not convert in to px', passthroughCSS('h1{width:192in}'));

test(
  'should strip the units from length properties',
  processCSS('h1{margin: 0em 0% 0px 0pc}', 'h1{margin: 0 0 0 0}')
);

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
  'should preserve opacities defined as percentages',
  passthroughCSS('h1{opacity:100%}')
);

test(
  'should remove unit from opacity: 0%',
  processCSS('h1{opacity:0%}', 'h1{opacity:0}')
);

test('should not mangle flex basis', passthroughCSS('h1{flex-basis:0%}'));

test('should not mangle flex basis (2)', passthroughCSS('h1{FLEX-BASIC:0%}'));

test('should not mangle values without units', passthroughCSS('h1{z-index:5}'));

test(
  'should operate in calc values',
  processCSS(
    'h1{width:calc(192px + 2em - (0px * 4))}',
    'h1{width:calc(2in + 2em - (0px * 4))}'
  )
);

test(
  'should operate in calc values (2)',
  processCSS(
    'h1{width:CALC(192px + 2em - (0px * 4))}',
    'h1{width:CALC(2in + 2em - (0px * 4))}'
  )
);

test(
  'should not convert zero values in calc',
  passthroughCSS('h1{width:calc(0em)}')
);

test(
  'should not mangle values outside of its domain',
  passthroughCSS('h1{background:url(a.png)}')
);

test(
  'should not mangle values outside of its domain (2)',
  passthroughCSS('h1{background:URL(a.png)}')
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
  'should not mangle duration values',
  passthroughCSS('.long{animation-duration:2s}')
);

test(
  'should not mangle padding values',
  passthroughCSS(
    'h1{padding:10px 20px 30px 40px}h2{padding:10px 20px 30px}h3{padding:10px 20px}h4{padding:10px}'
  )
);

test(
  'should trim leading zeroes from negative values',
  processCSS('h1,h2{letter-spacing:-0.1rem}', 'h1,h2{letter-spacing:-.1rem}')
);

test(
  'should support viewports units',
  processCSS('h1,h2{letter-spacing:-0.1vmin}', 'h1,h2{letter-spacing:-.1vmin}')
);

test('should support ch units', passthroughCSS('a{line-height:1.1ch}'));

test(
  'should support PX units',
  processCSS('h1{font-size:20PX}', 'h1{font-size:20PX}')
);

test(
  'should not mangle data urls',
  passthroughCSS(
    '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}'
  )
);

test(
  'should not mangle data urls (2)',
  passthroughCSS(
    '.has-svg:before{content:URL("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}'
  )
);

test(
  'should convert angle units',
  processCSS(
    'h1{transform: rotate(0.25turn);transform: rotate(0.25TURN)}',
    'h1{transform: rotate(90deg);transform: rotate(90deg)}'
  )
);

test(
  'should not convert length units',
  processCSS(
    'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
    'h1{transition-duration:.5s; width:calc(192px + 2em); width:14px; letter-spacing:-.1VMIN}',
    { length: false }
  )
);

test(
  'should not convert time units',
  processCSS(
    'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
    'h1{transition-duration:500ms; width:calc(2in + 2em); width:14px; letter-spacing:-.1VMIN}',
    { time: false }
  )
);

test(
  'should not convert angle units',
  processCSS(
    'h1{transform: rotate(0.25turn);transform: rotate(0.25TURN)}',
    'h1{transform: rotate(.25turn);transform: rotate(.25TURN)}',
    { angle: false }
  )
);

test(
  'should not remove units from angle values',
  passthroughCSS('h1{transform:rotate(0deg)}')
);

test(
  'should not remove units from angle values (2)',
  passthroughCSS('h1{transform:rotate(0turn)}')
);

test(
  'should not remove unit with zero value in hsl and hsla functions',
  passthroughCSS('h1{color:hsl(0, 0%, 244%); background:hsl(0, 0%, 0%)}')
);

test(
  'should strip trailing zeroes from percentage heights',
  processCSS('h1{height:12.500%}', 'h1{height:12.5%}')
);

test(
  'should not strip the percentage from 0 in max-height, height, and min-width props',
  passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}')
);

test(
  'should not crash when analysing a declaration with one parent',
  passthroughCSS('width:0')
);

test(
  'should strip the unit from 0 in max-height & height props',
  processCSS('h1{height:0em;max-height:0em}', 'h1{height:0;max-height:0}')
);

test(
  'should strip the unit from 0 in max-height & height props (2)',
  processCSS('h1{height:0em;MAX-HEIGHT:0em}', 'h1{height:0;MAX-HEIGHT:0}')
);

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
  'should keep unit in line-height (issue 768)',
  passthroughCSS('h1{line-height:0rem}')
);

test('should keep unit in max()', passthroughCSS('h1{margin:max(0px)}'));

test(
  'should keep unit in max() (2)',
  passthroughCSS('h1{margin:max(1px + 2em,0px)}')
);

test('should keep unit in min()', passthroughCSS('h1{margin:min(0px)}'));

test(
  'should keep unit in min() (2)',
  passthroughCSS('h1{margin:min(1px + 2em,0px)}')
);

test('should keep unit in clamp()', passthroughCSS('h1{margin:clamp(0px)}'));

test(
  'should keep unit in clamp() (2)',
  passthroughCSS('h1{margin:clamp(1px + 2em,0px)}')
);

test(
  'should keep unknown units or hacks',
  passthroughCSS('h1{top:0\\9\\0;left:0lightyear}')
);

test(
  'should not try to convert keyframe names in animation',
  passthroughCSS(
    'h1{ -webkit-animation: e836684w2 } h2{ animation: e836684w2 }'
  )
);

test(
  'should not try to convert keyframe names in animation (case 2)',
  passthroughCSS(
    `
.e4yw0Q {
    animation: e4yw0Q;
}

@keyframes e4yw0Q {}
    `
  )
);

['stroke-dasharray', 'stroke-dashoffset', 'stroke-width'].forEach(
  (property) => {
    test(
      `should not strip the percentage from 0 in SVG animation, for IE (${property})`,
      passthroughCSS(`@keyframes a{0%{${property}:200%}to{${property}:0%}}`)
    );
  }
);

['STROKE-DASHARRAY', 'STROKE-DASHOFFSET', 'STROKE-WIDTH'].forEach(
  (property) => {
    test(
      `should not strip the percentage from 0 in SVG animation, for IE (${property}) (2)`,
      passthroughCSS(`@KEYFRAMES a{0%{${property}:200%}to{${property}:0%}}`)
    );
  }
);

test(
  'should not convert ascent and descent-override',
  passthroughCSS(
    '@font-face {descent-override:0%;ascent-override:0%;line-gap-override:0%;size-adjust:0%;font-stretch:0%}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
