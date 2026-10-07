import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('component merging', () => {
  test(
    'should correctly handle a component a shorthand has already specified',
    processCSS(
      'a{border-left:1px solid;border-top-width:1px;border-width:1px}',
      'a{border-left:1px solid;border-width:1px}'
    )
  );
});

test(
  'should not merge borders with different support requirements across sides',
  passthroughCSS(
    'a{border-top:solid red;border-right:solid oklch(0.7 0.1 20);border-bottom:solid red;border-left:solid red}'
  )
);

test(
  'should not give a side a border a mistyped hex colour dropped',
  passthroughCSS(
    'a{border-top:1px solid #fffff;border-right:1px solid #fffff;border-bottom:1px solid #fffff;border-left:1px solid #fffff}'
  )
);

test(
  'should not merge a border-color whose hex is not hexadecimal',
  passthroughCSS(
    'a{border-top-color:#ggg;border-right-color:red;border-bottom-color:red;border-left-color:red}'
  )
);

test(
  'should not read a colour function beside a colour as one colour',
  passthroughCSS(
    'a{border-top-color:red rgb(0,0,0);border-right-color:red;border-bottom-color:red;border-left-color:red}'
  )
);

test(
  'should not merge unitless non-zero border-width into shorthand',
  passthroughCSS(
    'a{border-top-width:1;border-right-width:1px;border-bottom-width:1px;border-left-width:1px}'
  )
);

test(
  'should merge CSS Color 4 system color Canvas in border-color',
  processCSS(
    'a{border-top-color:Canvas;border-right-color:Canvas;border-bottom-color:Canvas;border-left-color:Canvas}',
    'a{border-color:Canvas}'
  )
);

test(
  'should merge border shorthand with system color Canvas',
  processCSS(
    'a{border-top:1px solid Canvas;border-right:1px solid Canvas;border-bottom:1px solid Canvas;border-left:1px solid Canvas}',
    'a{border-color:canvas;border-style:solid;border-width:1px}'
  )
);

test(
  'should merge CSS Color 4 system color Highlight in border-color',
  processCSS(
    'a{border-top-color:Highlight;border-right-color:Highlight;border-bottom-color:Highlight;border-left-color:Highlight}',
    'a{border-color:Highlight}'
  )
);

describe('border parsing validity and parseWsc contracts', () => {
  test(
    'passes through invalid border-top declaration with multiple style keywords (none solid)',
    passthroughCSS('a{border-top:none solid}')
  );

  test(
    'passes through invalid border-top with multiple styles alongside other longhands',
    passthroughCSS('a{border-top:none solid;border-top-color:red}')
  );

  test(
    'passes through invalid border shorthand with duplicate style keywords (none solid)',
    passthroughCSS('a{border:none solid}')
  );
});
