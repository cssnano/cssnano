import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS, processor } = processCSSFactory(plugin);

describe('Calc values and nested delimiters', () => {
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

  test(
    'should convert dimensions with raw escaped units',
    passthroughCSS('a{width:192\\70 x}')
  );

  test(
    'should not convert zero values in calc',
    passthroughCSS('h1{width:calc(0em)}')
  );
});

describe('Escaped and case-insensitive function names', () => {
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
});

describe('Raw PostCSS metadata and preceding plugins', () => {
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
});

describe('Math functions and preserving units', () => {
  test(
    'should not mangle values outside of its domain',
    passthroughCSS('h1{background:url(a.png)}')
  );

  test(
    'should not mangle values outside of its domain (2)',
    passthroughCSS('h1{background:URL(a.png)}')
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
    'should not crash when analysing a declaration with one parent',
    passthroughCSS('width:0')
  );

  test(
    'should preserve zero units inside CSS Values 4 math functions',
    passthroughCSS(
      'a{width:round(0px, 10px);x:mod(0px, 5px);y:hypot(0px, 3px);z:abs(0px)}'
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
    'should preserve 0px inside max()',
    passthroughCSS('h1{width:max(0px,100vw)}')
  );

  test(
    'should preserve 0px inside min()',
    passthroughCSS('h1{width:min(0px,100vw)}')
  );

  test(
    'should preserve 0px inside clamp()',
    passthroughCSS('h1{width:clamp(0px,50vw,100vw)}')
  );

  test(
    'should preserve 0% inside calc()',
    processCSS('h1{width:calc(0% + 100px)}', 'h1{width:calc(0% + 75pt)}')
  );
});
