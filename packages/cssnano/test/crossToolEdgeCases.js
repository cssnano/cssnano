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

  // esbuild#1702: an inherited shorthand cannot be combined with partial
  // longhands because `inherit` must occupy the whole property value.
  test(
    'does not merge inherit with partial border-radius longhands',
    processCss.passthrough(
      'div{border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0}'
    )
  );

  // esbuild#1776: an unsupported vendor selector invalidates a whole rule in
  // browsers that do not recognize it.
  test(
    'does not merge vendor-specific selectors into one selector list',
    processCss(
      '.form-input:-moz-placeholder-shown{color:black}.form-input:-ms-input-placeholder{color:black}.form-input:placeholder-shown{color:black}',
      '.form-input:-moz-placeholder-shown{color:#000}.form-input:-ms-input-placeholder{color:#000}.form-input:placeholder-shown{color:#000}'
    )
  );

  // lightningcss#1221: duplicate monospace entries preserve a browser
  // compatibility behavior and must not be deduplicated.
  test(
    'preserves duplicate monospace font-family fallbacks',
    processCss.passthrough('code{font-family:monospace,monospace}')
  );

  // lightningcss#1080: a 3D-to-2D rewrite changes 3D-transformed status.
  test(
    'does not reduce a 2D matrix3d() to matrix()',
    processCss.passthrough(
      'div{transform:matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)}'
    )
  );

  test(
    'does not reduce z-axis rotate3d() to rotate()',
    processCss.passthrough('div{transform:rotate3d(0,0,1,0deg)}')
  );

  test(
    'does not reduce rotateZ() to rotate()',
    processCss.passthrough('div{transform:rotateZ(0deg)}')
  );

  test(
    'does not reduce x-axis scale3d() to scaleX()',
    processCss.passthrough('div{transform:scale3d(2,1,1)}')
  );

  test(
    'does not reduce y-axis scale3d() to scaleY()',
    processCss.passthrough('div{transform:scale3d(1,2,1)}')
  );

  test(
    'reduces x-axis rotate3d() to rotateX()',
    processCss(
      'div{transform:rotate3d(1,0,0,0deg)}',
      'div{transform:rotateX(0deg)}'
    )
  );

  test(
    'reduces y-axis rotate3d() to rotateY()',
    processCss(
      'div{transform:rotate3d(0,1,0,0deg)}',
      'div{transform:rotateY(0deg)}'
    )
  );

  test(
    'reduces z-axis scale3d() to scaleZ()',
    processCss('div{transform:scale3d(1,1,2)}', 'div{transform:scaleZ(2)}')
  );

  test(
    'reduces translate3d() to translateZ()',
    processCss(
      'div{transform:translate3d(0,0,1px)}',
      'div{transform:translateZ(1px)}'
    )
  );

  // lightningcss#1199: invalid declarations must not be repaired by adding
  // units or evaluating invalid number-only calc() expressions.
  test(
    'does not infer units in invalid declarations',
    processCss('p{grid:1 / 1;width:3}', 'p{grid:1/1;width:3}')
  );

  // lightningcss#1324: wrapping a selector list in :is() can raise the
  // specificity of selectors that did not contain the more specific branch.
  test(
    'does not wrap mixed-specificity selector lists in :is()',
    processCss(
      '.flex-col,[flex-col=""]{flex-direction:column}.has-\\[\\>svg\\]\\:flex-col:has(>svg){flex-direction:column}@media (min-width:640px){.sm\\:flex-row{flex-direction:row}}',
      '.flex-col,[flex-col=""]{flex-direction:column}.has-\\[\\>svg\\]\\:flex-col:has(>svg){flex-direction:column}@media (min-width:640px){.sm\\:flex-row{flex-direction:row}}'
    )
  );

  // clean-css#1121: custom-property fallbacks remain in declaration order,
  // including important declarations.
  test(
    'preserves custom-property fallbacks across declarations',
    processCss(
      '.case1{border:1px solid var(--what-ever,red)!important}.case2{border:1px solid red!important;border:1px solid var(--what-ever,red)!important}.case3{border:1px solid red;border:1px solid var(--what-ever,red)}',
      '.case1{border:1px solid var(--what-ever,red)!important}.case2{border:1px solid red!important;border:1px solid var(--what-ever,red)!important}.case3{border:1px solid red;border:1px solid var(--what-ever,red)}'
    )
  );

  // clean-css#1133: the percent belongs to the multiplication operand, not
  // to the custom property name.
  test(
    'does not add a percent sign to a custom property in hsl()',
    processCss(
      '.test{color:hsl(0,0%,calc((var(--button_color_l) - 65) * -100%))!important}',
      '.test{color:hsl(0,0%,calc(-100% * (-65 + var(--button_color_l))))!important}'
    )
  );

  // clean-css#331: a custom family beginning with a digit must remain quoted.
  test(
    'keeps quotes required by custom font-family names',
    processCss(
      'a{font:20px/60px "22pro","Trebuchet MS","Helvetica Neue",Helvetica,Arial,sans-serif}',
      'a{font:20px/60px "22pro",Trebuchet MS,Helvetica Neue,Helvetica,Arial,sans-serif}'
    )
  );

  // esbuild#4315: duplicate declarations must not cause a media query to be
  // discarded.
  test(
    'preserves media queries around duplicate declarations',
    processCss(
      '@media only screen and (max-width:1px){.problematic{font-family:sans-serif;font-weight:350;font-size:10px;letter-spacing:.025em;line-height:100%;font-family:sans-serif;font-weight:700}}@media only screen and (min-width:2px) and (max-width:3px){.problematic{font-family:sans-serif;font-weight:350;font-size:12px;letter-spacing:.025em;line-height:100%;font-family:sans-serif;font-weight:700}}@media only screen and (min-width:4px){.problematic{font-family:sans-serif;font-weight:350;font-size:10px;letter-spacing:.025em;line-height:100%;font-family:sans-serif;font-weight:700}}',
      '@media only screen and (max-width:1px){.problematic{font-weight:350;font-size:10px;letter-spacing:.025em;line-height:100%;font-family:sans-serif;font-weight:700}}@media only screen and (min-width:2px) and (max-width:3px){.problematic{font-weight:350;font-size:12px;letter-spacing:.025em;line-height:100%;font-family:sans-serif;font-weight:700}}@media only screen and (min-width:4px){.problematic{font-weight:350;font-size:10px;letter-spacing:.025em;line-height:100%;font-family:sans-serif;font-weight:700}}'
    )
  );

  // clean-css#752: declarations between duplicate fallback properties remain
  // available to browsers with different vendor support.
  test(
    'preserves declarations between duplicate fallback properties',
    processCss(
      'canvas{-ms-interpolation-mode:nearest-neighbor;image-rendering:-webkit-optimize-contrast;image-rendering:-moz-crisp-edges;image-rendering:crisp-edges;-ms-interpolation-mode:nearest-neighbor;image-rendering:pixelated}',
      'canvas{image-rendering:-webkit-optimize-contrast;image-rendering:-moz-crisp-edges;image-rendering:crisp-edges;-ms-interpolation-mode:nearest-neighbor;image-rendering:pixelated}'
    )
  );

  // lightningcss#1086: keep the unprefixed declaration alongside the WebKit
  // fallback so Firefox can apply the effect.
  test(
    'preserves prefixed and unprefixed backdrop-filter declarations',
    processCss(
      '.glass-card-heavy{background:rgba(255,255,255,.6)!important;backdrop-filter:blur(16px) saturate(130%)!important;-webkit-backdrop-filter:blur(16px) saturate(130%)!important}',
      '.glass-card-heavy{background:hsla(0,0%,100%,.6)!important;backdrop-filter:blur(16px) saturate(130%)!important;-webkit-backdrop-filter:blur(16px) saturate(130%)!important}'
    )
  );

  // clean-css#1196: comments around custom properties must not make a
  // declaration disappear.
  test(
    'preserves custom properties separated by comments',
    processCss(
      ':root{/* Site container */--a:20px;/* Z indices for modals and dialogs */--foo:5050}.bar{z-index:var(--foo)}',
      ':root{--a:20px;--foo:5050}.bar{z-index:var(--foo)}'
    )
  );
});
