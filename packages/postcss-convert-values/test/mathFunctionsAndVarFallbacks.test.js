import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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
    'should preserve zero length and percentage units in anchor-size() fallbacks',
    passthroughCSS(
      'h1{width:anchor-size(--target width, 0px);height:anchor-size(--target height, 0%);top:anchor-size(self-inline, 0rem)}'
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

  test(
    'should preserve zero percentage in animation-timeline view() inset',
    passthroughCSS('h1{animation-timeline:view(0% 0%)}')
  );

  test(
    'should convert percentage to unitless zero in view-timeline-inset',
    processCSS('h1{view-timeline-inset:0%}', 'h1{view-timeline-inset:0}')
  );

  test(
    'should convert multiple percentages to unitless zeros in view-timeline-inset',
    processCSS('h1{view-timeline-inset:0% 0%}', 'h1{view-timeline-inset:0 0}')
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
