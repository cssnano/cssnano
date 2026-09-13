import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  processCSSFactory,
  usePostCSSPlugin,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Border order', () => {
  test(
    'should order border consistently',
    processCSS(
      'h1{border:1px solid red;border:1px red solid;border:solid 1px red;border:solid red 1px;border:red solid 1px;border:red 1px solid}',
      'h1{border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red}'
    )
  );

  test(
    'should order border consistently (uppercase property and value)',
    processCSS(
      'h1{BORDER:1PX SOLID RED;BORDER:1PX RED SOLID;BORDER:SOLID 1PX RED;BORDER:SOLID RED 1PX;BORDER:RED SOLID 1PX;BORDER:RED 1PX SOLID}',
      'h1{BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED}'
    )
  );

  test(
    'should order border with two properties',
    processCSS('h1{border:solid 1px}', 'h1{border:1px solid}')
  );

  test(
    'should pass through duplicate border components',
    passthroughCSS(
      'h1{border:1px 2px solid red;border:1px solid dashed red;border:1px solid red blue;border:min(1px,2px) solid red min(2px,3px)}'
    )
  );
});

test(
  'invalid border property should remain invalid',
  processCSS(
    'h1{border: 0 0 7px 7px solid black}',
    'h1{border: 0 0 7px 7px solid black}'
  )
);

describe('Order', () => {
  test(
    'should order border with color functions',
    processCSS(
      'h1{border:rgba(255,255,255,0.5) dashed thick}',
      'h1{border:thick dashed rgba(255,255,255,0.5)}'
    )
  );

  test(
    'should order border with width function',
    passthroughCSS('p{border-left: min(10px, 1vw) solid red;}')
  );

  test(
    'should order border longhand',
    processCSS(
      'h1{border-left:solid 2px red;border-right:#fff 3px dashed;border-top:dotted #000 1px;border-bottom:4px navy groove}',
      'h1{border-left:2px solid red;border-right:3px dashed #fff;border-top:1px dotted #000;border-bottom:4px groove navy}'
    )
  );

  test(
    'should order width currentColor',
    processCSS(
      'h1{border:solid 2vmin currentColor}',
      'h1{border:2vmin solid currentColor}'
    )
  );
});

describe('Skip', () => {
  test('should skip border:inherit', passthroughCSS('h1{border:inherit}'));

  test('should skip border:initial', passthroughCSS('h1{border:initial}'));

  test('should skip border:unset', passthroughCSS('h1{border:unset}'));
});

describe('Outline order', () => {
  test(
    'should order outline consistently',
    processCSS('h1{outline:solid red .6em}', 'h1{outline:.6em solid red}')
  );

  test(
    'should order outline(outline-color is invert)',
    processCSS('h1{outline:solid invert 1px}', 'h1{outline:1px solid invert}')
  );
});

test(
  'should handle -webkit-focus-ring & auto',
  processCSS(
    'h1{outline:-webkit-focus-ring-color 5px auto}',
    'h1{outline:5px auto -webkit-focus-ring-color}'
  )
);

test(
  'should support calc width in borders',
  processCSS(
    'h1 {border: solid red calc(20px - 10px);}',
    'h1 {border: calc(20px - 10px) solid red;}'
  )
);

test(
  'preserves fractional unitless border widths',
  processCSS('a{border:.5 solid red}', 'a{border:.5 solid red}')
);

test(
  'orders border with modern math functions as width',
  processCSS(
    'a{border:solid red round(2px, 1px);border:solid red hypot(3px, 4px);border:solid red min(10px)}',
    'a{border:round(2px, 1px) solid red;border:hypot(3px, 4px) solid red;border:min(10px) solid red}'
  )
);

test(
  'should pass through important comments (border)',
  passthroughCSS('border: 1px /*!wow*/ red solid')
);

describe('Pass through', () => {
  test(
    'should abort ordering when a var is detected (border)',
    passthroughCSS('border: solid 1px var(--red)')
  );

  test(
    'should abort ordering when a var is detected (border) (uppercase "var")',
    passthroughCSS('border: solid 1px VAR(--red)')
  );

  test(
    'should abort when consumed via css loader',
    passthroughCSS(
      'border: ___CSS_LOADER_IMPORT___0___ solid ___CSS_LOADER_IMPORT___1___;'
    )
  );

  test(
    'should abort ordering when a env is detected (border)',
    passthroughCSS(
      'border-bottom:env(safe-area-inset-bottom) solid transparent'
    )
  );

  test(
    'should abort ordering when a env is detected (border) (uppercase)',
    passthroughCSS(
      'border-bottom:ENV(safe-area-inset-bottom) solid transparent'
    )
  );

  test(
    'should abort ordering when a constant is detected (border)',
    passthroughCSS(
      'border-bottom:constant(safe-area-inset-bottom) solid transparent'
    )
  );

  test(
    'should abort ordering when a constant is detected (border) (uppercase)',
    passthroughCSS(
      'border-bottom:CONSTANT(safe-area-inset-bottom) solid transparent'
    )
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

describe('Order', () => {
  test(
    'should order border-block',
    processCSS(
      'border-inline: dashed blue 5px; border-inline-end: red solid .5em; border-block-end: dashed blue 5px; border-block: 5px solid red;border-block-start: rgba(0, 30, 105, 0.8) solid 1px;',
      'border-inline: 5px dashed blue; border-inline-end: .5em solid red; border-block-end: 5px dashed blue; border-block: 5px solid red;border-block-start: 1px solid rgba(0, 30, 105, 0.8);'
    )
  );

  test(
    'should order column-rule like border',
    processCSS(
      'h1 {column-rule: solid 8px;column-rule: inset 2px #33f;}',
      'h1 {column-rule: 8px solid;column-rule: 2px inset #33f;}'
    )
  );
});

test(
  'should not introduce double spaces when border style is omitted',
  processCSS('div{border:red 1px}', 'div{border:1px red}')
);

test('should synchronize raw values on cache hits and misses', async () => {
  const first = postcss.decl({ prop: 'border', value: 'red solid 1px' });
  first.raws.value = { raw: 'red solid 1px', value: 'red solid 1px' };
  const second = postcss.decl({ prop: 'border', value: 'red solid 1px' });
  second.raws.value = { raw: 'red solid 1px', value: 'red solid 1px' };
  const root = postcss.root({ nodes: [first, second] });
  await postcss([plugin()]).process(root, { from: undefined });

  assert.deepStrictEqual(
    [first, second].map((decl) => ({
      raw: decl.raws.value?.raw,
      value: decl.value,
    })),
    [
      { raw: '1px solid red', value: '1px solid red' },
      { raw: '1px solid red', value: '1px solid red' },
    ]
  );
});
