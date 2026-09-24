import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import transform from '../src/lib/transform.js';

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

describe('Raw PostCSS metadata and preceding plugins', () => {
  test('should delete raws.value when decl.raws.value has no raw property', () => {
    const decl = postcss.decl({ prop: 'width', value: '96px' });
    decl.raws.value = { value: '96px' };
    transform({}, false, decl);
    assert.equal(decl.value, '1in');
    assert.equal(decl.raws.value, undefined);
  });

  test('should synchronize raw PostCSS value metadata after conversion', async () => {
    const result = await processor('a{width:192px, /*x*/ 192px}');
    assert.equal(result.css, 'a{width:2in, /*x*/ 2in}');
    assert.deepEqual(result.root.first.first.raws.value, {
      raw: '2in, /*x*/ 2in',
      value: '2in, /*x*/ 2in',
    });
  });

  test('should reuse declaration cache across identical declarations and synchronize raw metadata', async () => {
    const result = await processor(
      'a{width:192px} b{width:192px} c{width:10px} d{width:10px}'
    );
    assert.equal(
      result.css,
      'a{width:2in} b{width:2in} c{width:10px} d{width:10px}'
    );

    const root = postcss.parse(
      'a{width:192px, /*x*/ 192px} b{width:192px, /*x*/ 192px}'
    );
    const cachedResult = await postcss([plugin()]).process(root, {
      from: undefined,
    });
    assert.equal(
      cachedResult.css,
      'a{width:2in, /*x*/ 2in} b{width:2in, /*x*/ 2in}'
    );
    assert.deepEqual(cachedResult.root.nodes[1].nodes[0].raws.value, {
      raw: '2in, /*x*/ 2in',
      value: '2in, /*x*/ 2in',
    });
  });

  test('should cache declarations inside non-keyframe at-rules (@media, @supports)', () => {
    const cache = new Map();
    const root = postcss.parse(
      '@media (min-width: 0px){a{stroke-dasharray:192px}}'
    );
    let decl;
    root.walkDecls((d) => {
      decl = d;
    });
    transform({}, false, decl, cache);
    assert.equal(decl.value, '2in');
    assert.ok(cache.has('stroke-dasharray:192px'));

    const keyframesRoot = postcss.parse(
      '@keyframes spin{from{stroke-dasharray:192px}}'
    );
    let keyframeDecl;
    keyframesRoot.walkDecls((d) => {
      keyframeDecl = d;
    });
    const keyframesCache = new Map();
    transform({}, false, keyframeDecl, keyframesCache);
    assert.equal(keyframesCache.size, 0);
  });

  test('should not cache opacity declarations inside keyframes', () => {
    const keyframesRoot = postcss.parse('@keyframes bounce{50%{opacity:1.2}}');
    let keyframeDecl;
    keyframesRoot.walkDecls((d) => {
      keyframeDecl = d;
    });
    const keyframesCache = new Map();
    transform({}, false, keyframeDecl, keyframesCache);
    assert.equal(keyframeDecl.value, '1.2');
    assert.equal(keyframesCache.size, 0);
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

  test(
    'should preserve zero units inside calc-size()',
    processCSS(
      'h1{width:calc-size(auto, 0px + 192px);height:calc-size(0px, 10px)}',
      'h1{width:calc-size(auto, 0px + 2in);height:calc-size(0px, 10px)}'
    )
  );
  test(
    'should preserve zero percentage inside anchor()',
    passthroughCSS('h1{top:anchor(--target 0%);left:anchor(top, 0%)}')
  );

  test(
    'should preserve zero units inside anchor-size()',
    passthroughCSS(
      'h1{width:anchor-size(width, 0px);height:anchor-size(height, 0%)}'
    )
  );

  test(
    'should preserve zero percentage inside contrast-color()',
    passthroughCSS('h1{color:contrast-color(0%)}')
  );

  test(
    'should preserve zero units inside view() timeline insets',
    passthroughCSS(
      'h1{view-timeline-inset:view(0px 0px);animation-range:view(0%)}'
    )
  );
});

describe('CSS custom property fallbacks (var)', () => {
  test(
    'should convert zero length units in top-level var fallback',
    processCSS('h1{width:var(--foo, 0px)}', 'h1{width:var(--foo, 0)}')
  );

  test(
    'should preserve zero units in var fallback inside calc()',
    passthroughCSS('h1{width:calc(var(--foo, 0px) + 10px)}')
  );

  test(
    'should convert percentage to unitless zero in var fallback for opacity',
    processCSS('h1{opacity:var(--foo, 0%)}', 'h1{opacity:var(--foo, 0)}')
  );

  test(
    'should convert 0% to 0 in var fallback inside linear-gradient()',
    processCSS(
      'h1{background:linear-gradient(red, var(--foo, 0%))}',
      'h1{background:linear-gradient(red, var(--foo, 0))}'
    )
  );

  test(
    'should preserve 0% in var fallback inside conic-gradient()',
    passthroughCSS('h1{background:conic-gradient(red, var(--foo, 0%))}')
  );

  test(
    'should preserve 0% in var fallback inside calc()',
    passthroughCSS('h1{width:calc(var(--foo, 0%) + 10px)}')
  );

  test(
    'should preserve zero units in var fallback for properties requiring zero length',
    passthroughCSS('h1{line-height:var(--foo, 0px);columns:var(--foo, 0px)}')
  );

  test(
    'should preserve zero percent in var fallback for SVG stroke properties',
    passthroughCSS('.bar{stroke-dasharray:var(--foo, 0%)}')
  );
});
