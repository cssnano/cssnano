---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): keep fallbacks when merging longhand properties

Declaring a property twice, where the later value uses syntax older browsers cannot parse, is how authors write a fallback. The plugin preserved this for `var()`, and for colour functions in `border`, but discarded the earlier declaration everywhere else, so

```css
.my-class {
  padding: 16px 35px;
  padding-bottom: calc(constant(safe-area-inset-bottom) + 16px);
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}
```

became `padding: 16px 35px calc(env(safe-area-inset-bottom) + 16px)`. Browsers without `env()` support then dropped the whole shorthand and lost the top, right and left padding as well. The same applied to `margin`, `border` and `column` properties.

A declaration is now kept whenever a later declaration for the same property introduces a function it does not use itself, since support for a function decides whether the declaration parses at all. The longhands around a fallback still merge, and repeated values that introduce no function are still collapsed, so `padding:1px;padding-bottom:2px;padding-bottom:3px` remains `padding:1px 1px 3px` and only the last of a chain of fallbacks is kept.

Declarations are also no longer hoisted over a later declaration that names part of them, such as moving `border-left` past a `border-left-width` that follows it.
