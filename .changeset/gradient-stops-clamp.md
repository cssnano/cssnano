---
"postcss-minify-gradients": patch
"cssnano-preset-default": patch
---

Recognizes `currentColor` and system colours such as `canvas` as colour stops, so their positions are clamped or dropped like any other stop. A stop position at or below the running non-negative maximum is now written as zero even when the two positions use different units, and minifying an already minified gradient no longer changes it again. Single-stop gradients lose positions that spell the default boundaries. Positions are no longer replaced with zero when the largest position is negative.
