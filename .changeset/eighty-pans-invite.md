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

A declaration is now kept whenever a later declaration for the same property reaches for a function the earlier one does not use and a browser may not support: `var()`, `env()`, `constant()`, or a colour function newer than `rgb()` and `hsl()`. A zero counts like any other fallback value, so the safe area inset written the usual way keeps all four sides:

```css
/* before: .footer{padding:10px 10px env(safe-area-inset-bottom)},
   which left a browser without env() with no padding at all */
.footer {
  padding-bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: 10px;
  padding-left: 10px;
  padding-right: 10px;
}
```

The same holds where the fallback is spelled as a shorthand: `a{border:1px solid red;border-color:rgba(0,0,0,.5)}` became `a{border:1px solid rgba(0,0,0,.5)}`, leaving a browser without `rgba()` with no border at all instead of the red one, and is now left as it was written.

Widely supported functions are not treated as fallbacks, so `border-width:1px;border-width:calc(1px + 1em)` still collapses to the `calc()`. The longhands around a real fallback still merge, and repeated values are still collapsed, so `padding:1px;padding-bottom:2px;padding-bottom:3px` remains `padding:1px 1px 3px` and only the last of a chain of fallbacks is kept.

Declarations are also no longer hoisted over a later declaration that names part of them, such as moving `border-left` past a `border-left-width` that follows it.
