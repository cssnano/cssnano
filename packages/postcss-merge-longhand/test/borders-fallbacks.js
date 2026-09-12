import { suite, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should handle !important statements for border-width props',
  processCSS(
    'h1{border:1px solid red!important;border-top-width:0!important;border-right-width:0!important;border-bottom-width:0!important;}',
    'h1{border:solid red!important;border-width:0 0 0 1px!important;}'
  )
);

test(
  'should handle mixed border declarations',
  processCSS(
    'h1{border: 2px solid red;border-bottom-width:0;border-right-width:0;border-top-width:0;}',
    'h1{border:solid red;border-width:0 0 0 2px;}'
  )
);

test(
  'avoid dropping custom property when merging expansions',
  passthroughCSS(
    'h1{border:1px solid;border-color:var(--BORDER);border-left-style:none;}'
  )
);

test(
  'should preserve border with inherit in the middle',
  passthroughCSS(`div {
  border: 1em solid;
  border-color: inherit;
  border-top: none;
}`)
);

test(
  'should not overwrite border-inline-start property',
  passthroughCSS(
    `h1{border-width: 0; border-inline-start-width: 1px; border-style: solid;}`
  )
);

test(
  'should preserve custom property declared between two border properties',
  passthroughCSS(`.arrow {
  border-style: solid;
  border-width: 50px;
  border-color: #fff transparent;
  border-color: var(--col) transparent;
  border-top: none;
  height: 0;
  width: 0;
}`)
);

for (const [name, values] of [
  ['custom properties', ['var(--a)', '2px', '3px', '4px']],
  ['CSS-wide keywords', ['inherit', 'inherit', 'inherit', 'inherit']],
  ['malformed values', ['1px 2px 3px', '2px', '3px', '4px']],
  ['invalid values', ['solid', '2px', '3px', '4px']],
  ['negative values', ['-1px', '2px', '3px', '4px']],
  ['hacked values', ['_1px', '2px', '3px', '4px']],
]) {
  test(
    `should preserve border radii with ${name}`,
    passthroughCSS(
      `a{border-top-left-radius:${values[0]};border-top-right-radius:${values[1]};border-bottom-right-radius:${values[2]};border-bottom-left-radius:${values[3]}}`
    )
  );
}

test(
  'should preserve border radii with mixed importance',
  passthroughCSS(
    'a{border-top-left-radius:1px!important;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should not override border image',
  passthroughCSS(`.style {
      border-image: linear-gradient(to right, rgba(230, 232, 235, 0), #e6e8eb) 0 0
        0 100%;
    border-left: 60px;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
}`)
);

test(
  'should preserve all axes',
  passthroughCSS(`.selector  {
  border-style: solid;
  border-width: 0px 0px 5px 5px;
  border-top-color: transparent;
}`)
);

test(
  'should not unsafely merge custom properties',
  passthroughCSS(`.foo {
  padding-top: var(--padding-top);
  padding-bottom: var(--padding-bottom);
  padding-left: var(--padding-left);
  padding-right: var(--padding-right);
}`)
);

test(
  'should not incorrectly merge values containing inherit',
  passthroughCSS(`a {
  border-color: inherit;
  border-style: inherit;
  border-width: inherit;
  border-width: 0;
}`)
);

test(
  `s`,
  passthroughCSS(`.parent .child {
    border-width: 1px;
    border-style: solid;
    border-color: transparent;
    border-right-color: inherit;
    border-top-color: transparent;
    border-bottom-color: transparent;
}`)
);

test(
  'should not introdudce spurious currentcolor',
  passthroughCSS(`div {
    border: 1px solid;
    border-color: red var(--grey);
}`)
);

test('should handle empty border', processCSS('h1{border:;}', 'h1{border:;}'));

suite('support-dependent (env()) merge blocking', () => {
  test(
    'should save fallbacks for border-width that use env()',
    passthroughCSS(
      'h1{border-bottom-width:1px;border-bottom-width:env(safe-area-inset-bottom)}'
    )
  );

  test(
    'should not merge border longhands over a fallback',
    passthroughCSS(
      'h1{border-top-width:1px;border-top-width:env(safe-area-inset-bottom);border-top-style:solid;border-top-color:red}'
    )
  );
});

suite('border-color', () => {
  test(
    'should keep only the last of a chain of fallback colours',
    processCSS(
      'h1{border-color:#ddd;border-color:#eee;border-color:rgba(0,0,0,.1)}',
      'h1{border-color:#eee;border-color:rgba(0,0,0,.1)}'
    )
  );

  test(
    'should merge borders whose colour comes from a modern colour function',
    processCSS(
      'h1{border-top:solid lab(50% 40 59.5);border-right:solid lab(50% 40 59.5);border-bottom:solid lab(50% 40 59.5);border-left:solid lab(50% 40 59.5)}',
      'h1{border-color:lab(50% 40 59.5);border-style:solid;border-width:medium}'
    )
  );

  test(
    'should merge borders whose colour is mixed',
    processCSS(
      'h1{border-top:solid color-mix(in srgb,red,blue);border-right:solid color-mix(in srgb,red,blue);border-bottom:solid color-mix(in srgb,red,blue);border-left:solid color-mix(in srgb,red,blue)}',
      'h1{border-color:color-mix(in srgb,red,blue);border-style:solid;border-width:medium}'
    )
  );

  test(
    'should not read a function that merely ends in a colour name as a colour',
    passthroughCSS('h1{border-top:solid my-rgb(1,2,3)}')
  );

  test(
    'should merge borders whose colour depends on the colour scheme',
    processCSS(
      'h1{border-top:solid light-dark(white,black);border-right:solid light-dark(white,black);border-bottom:solid light-dark(white,black);border-left:solid light-dark(white,black)}',
      'h1{border-color:light-dark(white,black);border-style:solid;border-width:medium}'
    )
  );

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
});
