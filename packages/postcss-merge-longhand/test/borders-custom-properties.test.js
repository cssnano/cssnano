import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'Should correctly merge border declarations (#551) (2)',
  processCSS(
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}',
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}'
  )
);

test(
  'Should correctly merge border declarations (#551) (2) (uppercase)',
  processCSS(
    'h1{BORDER:NONE;BORDER-TOP:6PX SOLID #000;BORDER-BOTTOM:1PX SOLID #FFF}',
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}'
  )
);

test(
  'should not break border-color (#553)',
  passthroughCSS(
    'h1{border:solid transparent;border-width:0 8px 16px;border-bottom-color:#eee}'
  )
);

test(
  'should not break border-color (#553) (uppercase)',
  passthroughCSS(
    'h1{BORDER:SOLID TRANSPARENT;BORDER-WIDTH:0 8PX 16PX;BORDER-BOTTOM-COLOR:#EEE}'
  )
);

test(
  'should not remove border-top-color (#554)',
  passthroughCSS(
    'h1{border-top-color: rgba(85, 85, 85, 0.95);border-bottom: 0}'
  )
);

test(
  'should not remove border-top-color (#554) (uppercase)',
  passthroughCSS(
    'h1{BORDER-TOP-COLOR: RGBA(85, 85, 85, 0.95);BORDER-BOTTOM: 0}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (1)',
  passthroughCSS(
    'h1{border:1px solid #d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (1) (uppercase)',
  passthroughCSS(
    'h1{BORDER:1PX SOLID #D3D6DB;BORDER:1PX SOLID VAR(--GRAY-LIGHTER);BORDER-LEFT-WIDTH:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (2)',
  passthroughCSS(
    'h1{border-left-style:solid;border-left-color:#d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (2) (uppercase)',
  passthroughCSS(
    'h1{BORDER-LEFT-STYLE:SOLID;BORDER-LEFT-COLOR:#D3D6DB;BORDER:1PX SOLID VAR(--GRAY-LIGHTER);BORDER-LEFT-WIDTH:0;}'
  )
);

test(
  'Should not convert currentcolor (#559)',
  passthroughCSS(
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'Should not convert currentcolor (#559) (uppercase)',
  processCSS(
    'h1{BORDER:2PX SOLID TRANSPARENT;BORDER-TOP-COLOR:CURRENTCOLOR;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'Should not convert currentcolor (#559) (2)',
  processCSS(
    'h1{border:2px solid transparent;border-top-color:currentColor;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'Should not convert currentcolor (#559) (2) (uppercase)',
  processCSS(
    'h1{BORDER:2PX SOLID TRANSPARENT;BORDER-TOP-COLOR:CURRENTCOLOR;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'should not drop border-width with custom property from border shorthand (#561)',
  passthroughCSS('h1{border:var(--border-width) solid grey}')
);

test(
  'should not drop border-width with custom property from border shorthand (#561) (uppercase)',
  passthroughCSS('h1{BORDER:VAR(--border-width) SOLID GREY}')
);

test(
  'Should not throw error (#570)',
  processCSS(
    'h1{border:1px none;border-bottom-style:solid}',
    'h1{border:1px;border-bottom:1px solid}'
  )
);

test(
  'Should not throw error (#570) (uppercase)',
  processCSS(
    'h1{BORDER:1PX NONE;BORDER-BOTTOM-STYLE:SOLID}',
    'h1{border:1px;border-bottom:1px solid}'
  )
);

test(
  'Should correctly merge borders with custom properties (#572)',
  passthroughCSS(
    'h1{border:6px solid red;border-top:6px solid var(--mycolor);}'
  )
);

test(
  'Should correctly merge borders with custom properties (#572) (uppercase)',
  passthroughCSS(
    'h1{BORDER:6PX SOLID RED;BORDER-TOP:6PX SOLID VAR(--mycolor);}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (1)',
  passthroughCSS('h1{border:1px solid;border-color:var(--color-var)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (1) (uppercase)',
  passthroughCSS('h1{BORDER:1PX SOLID;BORDER-COLOR:VAR(--COLOR-VAR)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (2)',
  passthroughCSS('h1{border-left:1px solid;border-left-color:var(--color-var)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (2) (uppercase)',
  passthroughCSS('h1{BORDER-LEFT:1PX SOLID;BORDER-LEFT-COLOR:VAR(--COLOR-VAR)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (3)',
  passthroughCSS(
    'h1{border-color:red green blue magenta;border-top-color:var(--color-var)}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (3) (uppercase)',
  passthroughCSS(
    'h1{BORDER-COLOR:RED GREEN BLUE MAGENTA;BORDER-TOP-COLOR:VAR(--COLOR-VAR)}'
  )
);

test(
  'Should not throw error when a border property value is undefined (#639)',
  passthroughCSS('h1{border:2px solid #fff;border-color:inherit}')
);

test(
  'Should not throw error when a border property value is undefined (#639) (uppercase)',
  passthroughCSS('h1{BORDER:2PX SOLID #FFF;BORDER-COLOR:INHERIT}')
);

test(
  'Should preserve case of css custom properties #648',
  passthroughCSS('h1{border:1px solid rgba(var(--fooBar));}')
);

test(
  'Should preserve case of css custom properties #648 (uppercase)',
  passthroughCSS('h1{BORDER:1PX SOLID RGBA(VAR(--fooBar));}')
);

test(
  'Should preserve case of css custom properties #847',
  passthroughCSS(
    'h1 {border: 1px solid hsla(var(--HUE), var(--SATURATION), var(--LUMINANCE), 0.5)}'
  )
);

test(
  'Should preserve case of css custom property names with hyphens',
  passthroughCSS('h1 { border: 1px solid rgba(var(--colors-secondaryColor)); }')
);

test(
  'Should preserve case of css custom properties example 2',
  passthroughCSS(
    'h1 {border:solid 2px var(--buttonBorderColor, var(--buttonBaseColor, #000));}'
  )
);

test(
  'Should preserve border rule with only custom properties #1051',
  passthroughCSS(
    'h1{border-color: var(--a) var(--b) var(--c) var(--d);border-style:solid;border:var(--fooBar));}'
  )
);

test(
  'should not break border rules mixing custom and regular properties',
  passthroughCSS(
    'h1{border:var(--v1) solid var(--v2, #abc123);border-right-color:blue}'
  )
);

test(
  'should not merge declarations with custom properties #1354',
  passthroughCSS(
    'h1{border-width:var(--width); border-style:solid; border-color: hotpink;}'
  )
);

test(
  'should not merge declarations with custom properties #675',
  passthroughCSS(
    '.class{border-width:var(--border-width);border-style:var(--border-style);border-color:var(--border-color);}'
  )
);

test(
  'should not merge declarations with custom properties #1044',
  passthroughCSS('div{border:1px solid;border-color:red var(--grey);}')
);

test(
  'do not crash',
  passthroughCSS(`.next-step-arrow[dir='rtl'] .next-step-item:before {
  border: 16px solid transparent;
  border-right: 16px solid transparent;
  border: var(--step-arrow-item-border-width, 16px) solid transparent;
  border-right-color: transparent;
}`)
);

test(
  'should overwrite some border-width props and save fallbacks and preserve case #648 2',
  processCSS(
    'h1{border-top-width:10px;border-right-width:var(--fooBar);border-right-width:15px;border-bottom-width:var(--fooBar);border-bottom-width:20px;border-left-width:25px;border-top-width:var(--fooBar);border-left-width:var(--fooBar)}',
    'h1{border-width:10px 15px 20px 25px;border-top-width:var(--fooBar);border-left-width:var(--fooBar)}'
  )
);

test(
  'should overwrite some border-width props and save fallbacks and preserve case #648 2 (uppercase)',
  processCSS(
    'h1{BORDER-TOP-WIDTH:10PX;BORDER-RIGHT-WIDTH:VAR(--fooBar);BORDER-RIGHT-WIDTH:15PX;BORDER-BOTTOM-WIDTH:VAR(--fooBar);BORDER-BOTTOM-WIDTH:20PX;BORDER-LEFT-WIDTH:25PX;BORDER-TOP-WIDTH:VAR(--fooBar);BORDER-LEFT-WIDTH:VAR(--fooBar)}',
    'h1{border-width:10PX 15PX 20PX 25PX;BORDER-TOP-WIDTH:VAR(--fooBar);BORDER-LEFT-WIDTH:VAR(--fooBar)}'
  )
);
