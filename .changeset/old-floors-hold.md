---
"postcss-merge-longhand": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

fix(postcss-merge-longhand): keep fallbacks for older browsers in more cases. Longhands that use `calc()` merge into a shorthand only when every target parses `calc()`, which Opera Mini, and so the default targets, do not. Longhands stay separate when one divides by a length inside `calc()`, or uses a math constant such as `pi` or `infinity` that some target lacks. When a browserslist target predates the support floor (such as IE 8 or Opera 12), the plugin keeps fallbacks for `rem`, angle and time units and `hsl()`, so `font-size:16px` before `font-size:1rem` survives.
