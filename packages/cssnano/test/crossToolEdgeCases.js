import { describe, test } from 'node:test';
import processCss from './_processCss.js';

describe('Cross-tool edge cases and modern CSS specifications', () => {
  test(
    'relative color syntax (CSS Color 4) preserves channel variables and slash alpha',
    processCss(
      'a{color:rgb(from var(--bg) r g b / 0.5)}',
      'a{color:rgb(from var(--bg) r g b/.5)}'
    )
  );

  test(
    'color-mix (CSS Color 5) preserves comma and percentage spacing with var()',
    processCss(
      'a{color:color-mix(in srgb, var(--a) 50%, var(--b) 50%)}',
      'a{color:color-mix(in srgb,var(--a) 50%,var(--b) 50%)}'
    )
  );

  test(
    '@starting-style (CSS Transitions 2) passes through and minifies contents',
    processCss(
      '@starting-style { .dialog { opacity: 0; } }',
      '@starting-style{.dialog{opacity:0}}'
    )
  );

  test(
    'media query range context (Media Queries 4) does not crash or corrupt bounds',
    processCss(
      '@media (400px <= width <= 800px) { h1 { color: red; } }',
      '@media (400px<=width<=800px){h1{color:red}}'
    )
  );

  test(
    'distinct anonymous @layer blocks do not merge and invert cascade order',
    processCss(
      '@layer { .first { color: red; } } @layer { .second { color: blue; } }',
      '@layer{.first{color:red}}@layer{.second{color:blue}}'
    )
  );

  test(
    'CSS Values 4 modern length and container query units are preserved',
    processCss(
      'div { width: 10svh; height: 20dvw; margin: 5cqw; padding: 2cqi; }',
      'div{width:10svh;height:20dvw;margin:5cqw;padding:2cqi}'
    )
  );

  test(
    'conic-gradient default 0% stop is safely minified without corrupting to unitless zero',
    processCss(
      'div { background: conic-gradient(red 0%, blue 100%); }',
      'div{background:conic-gradient(red,blue)}'
    )
  );

  test(
    'conic-gradient non-initial stop preserves 0% per CSS Images 4 angular stop syntax',
    processCss(
      'div { background: conic-gradient(red 0% 50deg, blue 100%); }',
      'div{background:conic-gradient(red 0% 50deg,blue)}'
    )
  );

  test(
    'font-family names default and none are kept quoted per CSS Fonts 4',
    processCss(
      'body { font-family: "default", sans-serif; h1 { font-family: "none", serif; } }',
      'body{font-family:"default",sans-serif;h1{font-family:"none",serif}}'
    )
  );

  test(
    'CSS Color 4 system colors in border-color merge across sides',
    processCss(
      'a { border-top-color: Canvas; border-right-color: Canvas; border-bottom-color: Canvas; border-left-color: Canvas; }',
      'a{border-color:Canvas}'
    )
  );

  test(
    'keeps static fallbacks before var() declarations for position, direction, and unicode-bidi',
    processCss(
      '.x{position:static;position:var(--x,static)}.y{direction:ltr;direction:var(--x,ltr)}.z{unicode-bidi:normal;unicode-bidi:var(--x,normal)}',
      '.x{position:static;position:var(--x,static)}.y{direction:ltr;direction:var(--x,ltr)}.z{unicode-bidi:normal;unicode-bidi:var(--x,normal)}'
    )
  );

  test(
    'keeps animation-timeline separate from the animation shorthand',
    processCss(
      '.x{animation:parallax 1ms linear both;animation-timeline:view()}',
      '.x{animation:parallax 1ms linear both;animation-timeline:view()}'
    )
  );

  test(
    'does not combine inherited transition shorthand with a transition longhand',
    processCss(
      '.x{transition:inherit;transition-property:bar}',
      '.x{transition:inherit;transition-property:bar}'
    )
  );

  test(
    'keeps the time unit multiplied with sibling-index()',
    processCss(
      '.x{animation-delay:calc(sibling-index() * .05s)}',
      '.x{animation-delay:calc(.05s * sibling-index())}'
    )
  );

  test(
    'retains the declaration separator before a nested rule',
    processCss(
      '.x{color:red;.y{color:blue}background:green}',
      '.x{color:red;.y{color:blue}background:green}'
    )
  );
});
