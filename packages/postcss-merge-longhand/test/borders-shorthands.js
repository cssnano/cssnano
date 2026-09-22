import { test } from 'node:test';
import topRightBottomLeft from '../src/lib/trbl.js';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should not merge fallback colours with shorthand property',
  processCSS(
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}',
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}'
  )
);

test(
  'should not merge fallback colours with shorthand property (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #CCC;BORDER:1PX SOLID RGBA(0,0,0,.2)}',
    'h1{BORDER:1PX SOLID #CCC;border:1px solid rgba(0,0,0,.2)}'
  )
);

test(
  'should merge together all initial values',
  passthroughCSS(
    'h1{border-color:initial;border-width:initial;border-style:initial}'
  )
);

test(
  'should merge together all initial values (uppercase)',
  passthroughCSS(
    'h1{BORDER-COLOR:initial;BORDER-WIDTH:initial;BORDER-STYLE:initial}'
  )
);

test(
  'should merge together all initial values 1 (uppercase)',
  passthroughCSS(
    'h1{border-color:INITIAL;border-width:INITIAL;border-style:INITIAL}'
  )
);

test(
  'should merge together all inherit values',
  passthroughCSS(
    'h1{border-color:inherit;border-width:inherit;border-style:inherit}'
  )
);

test(
  'should merge together all inherit values (uppercase)',
  passthroughCSS(
    'h1{BORDER-COLOR:INHERIT;BORDER-WIDTH:INHERIT;BORDER-STYLE:INHERIT}'
  )
);

test(
  'should preserve nesting level',
  processCSS(
    'section{h1{border-color:red;border-width:1px;border-style:solid}}',
    'section{h1{border-color:red;border-style:solid;border-width:1px}}'
  )
);

test(
  'should preserve nesting level (uppercase)',
  processCSS(
    'section{h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX;BORDER-STYLE:SOLID}}',
    'section{h1{border-color:red;border-style:solid;border-width:1px}}'
  )
);

test(
  'should not merge custom properties',
  passthroughCSS(
    ':root{--my-border-width:2px;--my-border-style:solid;--my-border-color:#fff;}'
  )
);

test(
  'should not merge custom properties (uppercase)',
  passthroughCSS(
    ':root{--MY-BORDER-WIDTH:2PX;--MY-BORDER-STYLE:SOLID;--MY-BORDER-COLOR:#FFF;}'
  )
);

test(
  'should not merge custom properties with variables',
  passthroughCSS(
    ':root{--my-border-width:var(--my-border-width);--my-border-style:var(--my-border-style);--my-border-color:var(--my-border-color);}'
  )
);

test(
  'should not merge custom properties with variables (uppercase)',
  passthroughCSS(
    ':root{--MY-BORDER-WIDTH:VAR(--MY-BORDER-WIDTH);--MY-BORDER-STYLE:VAR(--MY-BORDER-STYLE);--MY-BORDER-COLOR:VAR(--MY-BORDER-COLOR);}'
  )
);

test(
  'should overwrite some border-width props and save fallbacks',
  processCSS(
    'h1{border-top-width:10px;border-right-width:var(--variable);border-right-width:15px;border-bottom-width:var(--variable);border-bottom-width:20px;border-left-width:25px;border-top-width:var(--variable);border-left-width:var(--variable)}',
    'h1{border-width:10px 15px 20px 25px;border-top-width:var(--variable);border-left-width:var(--variable)}'
  )
);

test(
  'should overwrite some border-width props and save fallbacks (uppercase)',
  processCSS(
    'h1{BORDER-TOP-WIDTH:10PX;BORDER-RIGHT-WIDTH:VAR(--VARIABLE);BORDER-RIGHT-WIDTH:15PX;BORDER-BOTTOM-WIDTH:VAR(--VARIABLE);BORDER-BOTTOM-WIDTH:20PX;BORDER-LEFT-WIDTH:25PX;BORDER-TOP-WIDTH:VAR(--VARIABLE);BORDER-LEFT-WIDTH:VAR(--VARIABLE)}',
    'h1{border-width:10PX 15PX 20PX 25PX;BORDER-TOP-WIDTH:VAR(--VARIABLE);BORDER-LEFT-WIDTH:VAR(--VARIABLE)}'
  )
);

test(
  'save fallbacks should border-style',
  processCSS(
    'h1{border-style:dotted;border-style:var(--variable)}',
    'h1{border-style:dotted;border-style:var(--variable)}'
  )
);

test(
  'save fallbacks should border-color (uppercase)',
  passthroughCSS('h1{BORDER-COLOR:DOTTED;BORDER-COLOR:VAR(--VARIABLE)}')
);

test(
  'should not explode border with custom properties',
  passthroughCSS('h1{border:var(--variable)}')
);

test(
  'should not explode border with custom properties (uppercase)',
  passthroughCSS('h1{border:VAR(--VARIABLE)}')
);

test(
  'should not explode border with initial properties',
  passthroughCSS('h1{border:initial}')
);

test(
  'should not explode border with initial properties (uppercase)',
  passthroughCSS('h1{BORDER:initial}')
);

test(
  'should not explode border with initial properties 1 (uppercase)',
  passthroughCSS('h1{border:INITIAL}')
);

test(
  'should not explode border with inherit properties',
  passthroughCSS('h1{border:inherit}')
);

test(
  'should not explode border with inherit properties (uppercase)',
  passthroughCSS('h1{BORDER:inherit}')
);

test(
  'should not explode border with inherit properties 1 (uppercase)',
  passthroughCSS('h1{border:INHERIT}')
);

test(
  'should not explode border with unset properties',
  passthroughCSS('h1{border:unset}')
);

test(
  'should not explode border with unset properties (uppercase)',
  passthroughCSS('h1{BORDER:unset}')
);

test(
  'should not explode border with unset properties 1 (uppercase)',
  passthroughCSS('h1{border:UNSET}')
);

test(
  'should not explode border with revert properties (uppercase)',
  passthroughCSS('h1{BORDER:revert}')
);

test(
  'should not explode border with revert-layer properties',
  passthroughCSS(
    'h1{border-width:1px;border-style:solid;border-color:revert-layer}'
  )
);

for (const direction of topRightBottomLeft) {
  test(
    `should not explode border-${direction} with custom properties`,
    passthroughCSS(`h1{border-${direction}:var(--variable)}`)
  );

  test(
    `should not explode border-${direction.toUpperCase()} with custom properties`,
    passthroughCSS(`h1{BORDER-${direction.toUpperCase()}:VAR(--variable)}`)
  );
}

test(
  'should not explode custom properties with less than two concrete sides (1)',
  passthroughCSS(
    'h1{border:var(--border-width) var(--border-style) transparent}'
  )
);

test(
  'should not explode custom properties with less than two concrete sides (1) (uppercase)',
  passthroughCSS(
    'h1{BORDER:VAR(--BORDER-WIDTH) VAR(--BORDER-STYLE) TRANSPARENT}'
  )
);

test(
  'should not explode custom properties with less than two concrete sides (2)',
  passthroughCSS('h1{border:var(--border-width) solid var(--border-color)}')
);

test(
  'should not explode custom properties with less than two concrete sides (2) (uppercase)',
  passthroughCSS('h1{BORDER:VAR(--BORDER-WIDTH) SOLID VAR(--BORDER-COLOR)}')
);

test(
  'should not explode custom properties with less than two concrete sides (3)',
  passthroughCSS('h1{border:1px var(--border-style) var(--border-color)}')
);

test(
  'should not explode custom properties with less than two concrete sides (3) (uppercase)',
  passthroughCSS('h1{BORDER:1PX VAR(--BORDER-STYLE) VAR(--BORDER-COLOR)}')
);

test(
  'Should correctly merge border declarations (#551) (1)',
  processCSS(
    'h1{border:1px solid black;border-top-width:2px;border-right-width:2px;border-bottom-width:2px}',
    'h1{border:2px solid black;border-left-width:1px}'
  )
);

test(
  'Should correctly merge border declarations (#551) (1) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID BLACK;BORDER-TOP-WIDTH:2PX;BORDER-RIGHT-WIDTH:2PX;BORDER-BOTTOM-WIDTH:2PX}',
    'h1{border:2px solid black;border-left-width:1px}'
  )
);
