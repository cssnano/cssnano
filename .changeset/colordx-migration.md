---
"postcss-colormin": patch
"postcss-minify-gradients": patch
---

Replace `colord` with `@colordx/core` as the underlying color manipulation library. `colord` has not been updated since August 2022; `colordx` is its actively maintained successor with a compatible API.

This fixes a lossiness bug in `postcss-colormin` ([#1515](https://github.com/cssnano/cssnano/issues/1515)): colors like `rgba(221, 221, 221, 0.5)` were previously converted to `hsla(0,0%,87%,.5)`, which round-trips back to `rgb(222, 222, 222)` — a visibly different color at sharp image/UI boundaries. The new output is fully lossless and picks the shortest representation.

The root cause was that `colord` rounds color values to integers at parse time, so HSL conversions accumulate rounding error. `colordx` stores values as floats, preserving exact precision through conversions and producing correct output:

```css
/* Input */
rgba(221, 221, 221, 0.5)  →  hsla(0,0%,86.7%,.5)   /* shorter and lossless ✓ */
rgba(50%, 50%, 50%, 0.5)  →  hsla(0,0%,50%,.5)      /* shorter and lossless ✓ */
```

Additional improvements:

- `oklch()`, `oklab()`, and `hwb()` values that fall within the sRGB gamut are now correctly minified in `postcss-colormin` (previously passed through unchanged)
- Modern CSS color formats (`oklch`, `oklab`, `hwb`, `lch`) are now correctly recognised as valid gradient color stops in `postcss-minify-gradients`
