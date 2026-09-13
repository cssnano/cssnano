import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test('matches escaped and mixed-case keywords across ordered shorthands', () => {
  assert.strictEqual(
    postcss([plugin()]).process(
      'a{animation:1s \\65 ase-in fade;transition:opacity 1S \\45 ase;list-style:\\6f utside square}',
      { from: undefined }
    ).css,
    'a{animation:fade 1s \\65 ase-in;transition:opacity 1S \\45 ase;list-style:square \\6f utside}'
  );
});

test('preserves malformed values that cannot be safely reordered', () => {
  const input =
    'a{border:solid red 1px / blue;grid-column:2/;grid-row:/2;transition:opacity calc(1s +) ease}';
  assert.strictEqual(
    postcss([plugin()]).process(input, { from: undefined }).css,
    input
  );
});

test(
  'orders list-style with uppercase and mixed-case keywords',
  processCSS(
    'a{list-style:inside NONE disc;list-style:INSIDE none square;list-style:NONE inside none;list-style:none inside NONE}',
    'a{list-style:disc inside NONE;list-style:square INSIDE none;list-style:NONE inside none;list-style:none inside NONE}'
  )
);

test(
  'preserves declarations in non-list properties with top-level commas',
  passthroughCSS(
    'a{border:1px, red;grid-column:my-line, 1;columns:100px, 2;flex-flow:row, wrap;list-style:inside, disc}'
  )
);

test(
  'preserves invalid list-style declarations',
  passthroughCSS(
    'a{list-style:inside 10px;list-style:inside / foo;list-style:inside outside disc;list-style:none none none;list-style:initial disc;list-style:default inside disc;list-style:url(a.png) disc none;list-style:disc none none}'
  )
);

test(
  'orders list-style with custom counter styles and none',
  processCSS(
    'a{list-style:none inside my-counter;list-style:none inside ">"}',
    'a{list-style:my-counter inside none;list-style:">" inside none}'
  )
);

describe('Order', () => {
  test(
    'should order list-style 1',
    processCSS('ul{list-style: unset}', 'ul{list-style: unset}')
  );

  test(
    'should order list-style 2',
    processCSS('ul{list-style: none}', 'ul{list-style: none}')
  );

  test(
    'should order list-style 3',
    processCSS('ul{list-style: square inside}', 'ul{list-style: square inside}')
  );

  test(
    'should order list-style 4',
    processCSS('ul{list-style: inside square}', 'ul{list-style: square inside}')
  );

  test(
    'should order list-style 5',
    processCSS('ul{list-style: square unset}', 'ul{list-style: square unset}')
  );

  test(
    'should order list-style 6',
    processCSS('ul{list-style: inside none}', 'ul{list-style: none inside}')
  );

  test(
    'should order list-style none as the image when type is already set',
    processCSS(
      'ul{list-style: inside none disc}',
      'ul{list-style: disc inside none}'
    )
  );

  test(
    'should pass through list-style with one or two none tokens',
    processCSS(
      'ul{list-style:inside none;list-style:none inside none}',
      'ul{list-style:none inside;list-style:none inside none}'
    )
  );

  test(
    'should order list-style 7',
    processCSS('ul{list-style: unset inside}', 'ul{list-style: unset inside}')
  );

  test(
    'should order list-style 8',
    processCSS(
      'ul{list-style: circle unset none}',
      'ul{list-style: circle unset none}'
    )
  );

  test(
    'should order list-style 9',
    processCSS(
      'ul{list-style: circle url("https://mdn.mozillademos.org/files/11981/starsolid.gif")}',
      'ul{list-style: circle url("https://mdn.mozillademos.org/files/11981/starsolid.gif")}'
    )
  );

  test(
    'should order list-style 10',
    processCSS('ul{list-style: circle none}', 'ul{list-style: circle none}')
  );

  test(
    'should order list-style 11',
    processCSS(
      'ul{list-style: unset none circle}',
      'ul{list-style: unset none circle}'
    )
  );

  test(
    'should order list-style 12',
    passthroughCSS(
      'ul{list-style: circle url("https://mdn.mozillademos.org/files/11981/starsolid.gif") none}'
    )
  );

  test(
    'should order list-style 13',
    passthroughCSS('ul{list-style: unknown unset none}')
  );

  test(
    'should classify unquoted URLs as list-style images',
    processCSS(
      'a{list-style:inside url(icon.svg) none}',
      'a{list-style:none inside url(icon.svg)}'
    )
  );
});
