import { fileURLToPath } from 'node:url';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import nodepath from 'node:path';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { join } = nodepath;
const { passthroughCSS, processCSS, processor } = processCSSFactory(plugin);

describe('Convert', () => {
  test(
    'should convert milliseconds to seconds',
    processCSS('h1{transition-duration:500ms}', 'h1{transition-duration:.5s}')
  );

  test(
    'should convert 0ms to 0s',
    processCSS(
      'h1{animation:opacity 0ms 1000ms}',
      'h1{animation:opacity 0s 1s}'
    )
  );

  test(
    'should convert multiple comma-separated values',
    processCSS(
      'h1{animation-delay: 500ms, 1000ms}',
      'h1{animation-delay: .5s, 1s}'
    )
  );

  test(
    'should convert seconds to milliseconds',
    processCSS('h1{transition-duration:.005s}', 'h1{transition-duration:5ms}')
  );

  test(
    'should convert exponent-form numbers',
    processCSS(
      'h1{width:1e2px;transition-duration:1e3ms;letter-spacing:1e-2px}',
      'h1{width:75pt;transition-duration:1s;letter-spacing:.01px}'
    )
  );

  test(
    'should not convert negative milliseconds to seconds',
    passthroughCSS('h1{animation-duration:-569ms}')
  );

  test(
    'should preserve opaque URL tokens while converting nested math',
    processCSS(
      'h1{width:calc(192px + 1e-2px);background:url(foo\\ bar.png)}',
      'h1{width:calc(2in + .01px);background:url(foo\\ bar.png)}'
    )
  );
});

describe('Remove', () => {
  test(
    'should not remove the unit from zero values (duration)',
    passthroughCSS('h1{transition-duration:0s}')
  );

  test(
    'should not remove the unit from zero values (custom properties)',
    passthroughCSS('h1{--my-variable:0px}')
  );
});

describe('Convert', () => {
  test(
    'should not convert values in custom properties by default',
    passthroughCSS('h1{--my-variable:500ms}')
  );

  test(
    'should convert values in custom properties when transformCustomProperties is true',
    processCSS('h1{--my-variable:500ms}', 'h1{--my-variable:.5s}', {
      transformCustomProperties: true,
    })
  );
});

test(
  'should remove unnecessary plus signs',
  processCSS('h1{width:+14px}', 'h1{width:14px}')
);

describe('Convert', () => {
  test(
    'should convert px to pc',
    processCSS('h1{width:16px}', 'h1{width:1pc}')
  );

  test(
    'should convert px to pt',
    processCSS('h1{width:120px}', 'h1{width:90pt}')
  );

  test(
    'should convert px to in',
    processCSS('h1{width:192px}', 'h1{width:2in}')
  );

  test('should not convert in to px', passthroughCSS('h1{width:192in}'));
});

test(
  'should strip the units from length properties',
  processCSS('h1{margin: 0em 0% 0px 0pc}', 'h1{margin: 0 0 0 0}')
);

describe('Trim', () => {
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
});

test(
  'should preserve opacities defined as percentages',
  passthroughCSS('h1{opacity:100%}')
);

test(
  'should remove unit from opacity: 0%',
  processCSS('h1{opacity:0%}', 'h1{opacity:0}')
);

describe('Mangle', () => {
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

describe('Operate', () => {
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
    'should preserve zero dimensions after grouping parentheses in calc',
    processCSS('a{width:calc((1px) + 0px)}', 'a{width:calc((1px) + 0px)}')
  );

  test(
    'should preserve zero dimensions through nested functions and grouping',
    processCSS(
      'a{width:calc(min((1px),0px) + 0px)}',
      'a{width:calc(min((1px),0px) + 0px)}'
    )
  );

  test(
    'should convert dimensions inside square blocks',
    processCSS('a{width:calc([192px] + 0px)}', 'a{width:calc([2in] + 0px)}')
  );

  test(
    'should convert dimensions inside curly blocks',
    processCSS('a{width:calc({192px} + 0px)}', 'a{width:calc({2in} + 0px)}')
  );

  test(
    'should keep scanning after mismatched delimiters',
    processCSS(
      'a{width:calc([192px) + 0px] 192px}',
      'a{width:calc([2in) + 0px] 2in}'
    )
  );

  test(
    'should recover from mismatched nested function and square delimiters',
    processCSS(
      'a{width:calc([min(0px)] 192px)}',
      'a{width:calc([min(0px)] 2in)}'
    )
  );

  test(
    'should recover from mismatched curly and square delimiters',
    processCSS('a{width:calc({[192px} 192px])}', 'a{width:calc({[2in} 2in])}')
  );

  test('should preserve zero units in escaped calc names', async () => {
    const result = await processor('a{width:c\\61 lc(0px)}');
    assert.equal(result.css, 'a{width:c\\61 lc(0px)}');
  });

  test('should preserve zero units in escaped min names', async () => {
    const result = await processor('a{width:m\\69 n(0px)}');
    assert.equal(result.css, 'a{width:m\\69 n(0px)}');
  });

  test('should preserve dimensions in escaped url names', async () => {
    const result = await processor('a{background:u\\72 l(192px)}');
    assert.equal(result.css, 'a{background:u\\72 l(192px)}');
  });

  test('should preserve zero units in case-insensitive color-mix names', async () => {
    const result = await processor('a{color:COLOR-MIX(0px)}');
    assert.equal(result.css, 'a{color:COLOR-MIX(0px)}');
  });

  test('should preserve zero units in escaped color-mix names', async () => {
    const result = await processor('a{color:c\\6f lor-mix(0px)}');
    assert.equal(result.css, 'a{color:c\\6f lor-mix(0px)}');
  });

  test('should preserve zero units in case-insensitive hsl names', async () => {
    const result = await processor('a{color:HSL(0px)}');
    assert.equal(result.css, 'a{color:HSL(0px)}');
  });

  test('should preserve zero units in escaped hsl names', async () => {
    const result = await processor('a{color:h\\73 l(0px)}');
    assert.equal(result.css, 'a{color:h\\73 l(0px)}');
  });

  test('should preserve zero units in case-insensitive linear names', async () => {
    const result = await processor('a{width:LINEAR(0px)}');
    assert.equal(result.css, 'a{width:LINEAR(0px)}');
  });

  test('should preserve zero units in escaped linear names', async () => {
    const result = await processor('a{width:l\\69 near(0px)}');
    assert.equal(result.css, 'a{width:l\\69 near(0px)}');
  });

  test(
    'should convert dimensions with raw escaped units',
    passthroughCSS('a{width:192\\70 x}')
  );
});

test('should synchronize raw PostCSS value metadata after conversion', async () => {
  const result = await processor('a{width:192px, /*x*/ 192px}');
  assert.equal(result.css, 'a{width:2in, /*x*/ 2in}');
  assert.deepEqual(result.root.first.first.raws.value, {
    raw: '2in, /*x*/ 2in',
    value: '2in, /*x*/ 2in',
  });
});

test('should use a declaration value changed by a preceding plugin', async () => {
  const preceding = {
    postcssPlugin: 'change-value',
    Declaration(decl) {
      decl.value = '96px';
    },
  };
  const result = await postcss([preceding, plugin()]).process(
    'a{width:192px}',
    { from: undefined }
  );
  assert.equal(result.css, 'a{width:1in}');
});

test('should ignore stale raw value metadata from a preceding plugin', async () => {
  const preceding = {
    postcssPlugin: 'change-value-and-raw',
    Declaration(decl) {
      decl.raws.value = { raw: '192px /* stale */', value: '192px' };
      decl.value = '96px';
    },
  };
  const result = await postcss([preceding, plugin()]).process(
    'a{width:192px}',
    { from: undefined }
  );
  assert.equal(result.css, 'a{width:1in}');
});

test(
  'should not convert zero values in calc',
  passthroughCSS('h1{width:calc(0em)}')
);

describe('Mangle', () => {
  test(
    'should not mangle values outside of its domain',
    passthroughCSS('h1{background:url(a.png)}')
  );

  test(
    'should not mangle values outside of its domain (2)',
    passthroughCSS('h1{background:URL(a.png)}')
  );
});

describe('Optimise', () => {
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
});

describe('Handle', () => {
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
});

describe('Mangle', () => {
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
});

test(
  'should trim leading zeroes from negative values',
  processCSS('h1,h2{letter-spacing:-0.1rem}', 'h1,h2{letter-spacing:-.1rem}')
);

describe('Support', () => {
  test(
    'should support viewports units',
    processCSS(
      'h1,h2{letter-spacing:-0.1vmin}',
      'h1,h2{letter-spacing:-.1vmin}'
    )
  );

  test('should support ch units', passthroughCSS('a{line-height:1.1ch}'));

  test(
    'should support PX units',
    processCSS('h1{font-size:20PX}', 'h1{font-size:20PX}')
  );
});

describe('Mangle', () => {
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
});

describe('Convert', () => {
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
});

describe('Remove', () => {
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
});

describe('Strip', () => {
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
});

test(
  'should not crash when analysing a declaration with one parent',
  passthroughCSS('width:0')
);

describe('Strip', () => {
  test(
    'should strip the unit from 0 in max-height & height props',
    processCSS('h1{height:0em;max-height:0em}', 'h1{height:0;max-height:0}')
  );

  test(
    'should strip the unit from 0 in max-height & height props (2)',
    processCSS('h1{height:0em;MAX-HEIGHT:0em}', 'h1{height:0;MAX-HEIGHT:0}')
  );
});

describe('Round', () => {
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
});

describe('Clamp', () => {
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
});

describe('Keep', () => {
  test(
    'should keep stripping zeroes from opacity',
    processCSS('h1{opacity:0.0625}', 'h1{opacity:.0625}')
  );

  test(
    'should keep stripping zeroes from opacity (2)',
    processCSS('h1{OPACITY:0.0625}', 'h1{OPACITY:.0625}')
  );
});

test(
  'should handle global values for opacity',
  passthroughCSS('h1{opacity:initial}')
);

describe('Clamp', () => {
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
});

describe('Clamp', () => {
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

test(
  'should handle global values for shape-image-threshold',
  passthroughCSS('h1{shape-image-threshold:initial}')
);

describe('Keep', () => {
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
});

describe('Try', () => {
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
});

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

test(
  `should not strip the percentage from 0 in @property, for initial-value`,
  processCSS(
    `@property --percent{syntax:'<percentage>';inherits:false;initial-value:0%;}`,
    `@property --percent{syntax:'<percentage>';inherits:false;initial-value:0%;}`
  )
);

test(
  `should not strip the percentage from 0 in @property, for initial-value (syntax string in double quotes)`,
  processCSS(
    `@property --percent{syntax:"<percentage>";inherits:false;initial-value:0%;}`,
    `@property --percent{syntax:"<percentage>";inherits:false;initial-value:0%;}`
  )
);

test(
  `should not strip the percentage from 0 in @property, for initial-value (length-percentage)`,
  processCSS(
    `@property --percent{syntax:'<length-percentage>';inherits:false;initial-value:0%;}`,
    `@property --percent{syntax:'<length-percentage>';inherits:false;initial-value:0%;}`
  )
);

test(
  `should not strip the percentage from 0 in @property, for initial-value (length-percentage, syntax string in double quotes)`,
  processCSS(
    `@property --percent{syntax:"<length-percentage>";inherits:false;initial-value:0%;}`,
    `@property --percent{syntax:"<length-percentage>";inherits:false;initial-value:0%;}`
  )
);

describe('Strip', () => {
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
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
