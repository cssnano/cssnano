import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
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
    'should preserve dimensions with raw escaped units',
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

  test('should preserve zero units in vendor-prefixed calc names', async () => {
    const webkitResult = await processor('div{width:-webkit-calc(100% - 0px)}');
    assert.equal(webkitResult.css, 'div{width:-webkit-calc(100% - 0px)}');

    const mozResult = await processor('div{width:-moz-calc(100% - 0px)}');
    assert.equal(mozResult.css, 'div{width:-moz-calc(100% - 0px)}');

    const oResult = await processor('div{width:-o-calc(100% - 0px)}');
    assert.equal(oResult.css, 'div{width:-o-calc(100% - 0px)}');
  });

  test('should preserve zero units in vendor-prefixed conic-gradient names', async () => {
    const result = await processor(
      'div{background:-webkit-conic-gradient(red 0%, blue 100%)}'
    );
    assert.equal(
      result.css,
      'div{background:-webkit-conic-gradient(red 0%, blue 100%)}'
    );
  });

  test('should preserve zero units in vendor-prefixed cross-fade names', async () => {
    const result = await processor(
      'div{background-image:-webkit-cross-fade(url(a.png) 0%, url(b.png) 100%)}'
    );
    assert.equal(
      result.css,
      'div{background-image:-webkit-cross-fade(url(a.png) 0%, url(b.png) 100%)}'
    );
  });
});
