---
"cssnano": major
"cssnano-preset-advanced": major
"cssnano-preset-default": major
"cssnano-preset-lite": major
"cssnano-utils": major
"postcss-colormin": major
"postcss-convert-values": major
"postcss-discard-comments": major
"postcss-discard-duplicates": major
"postcss-discard-empty": major
"postcss-discard-overridden": major
"postcss-discard-unused": major
"postcss-merge-idents": major
"postcss-merge-longhand": major
"postcss-merge-rules": major
"postcss-minify-font-values": major
"postcss-minify-gradients": major
"postcss-minify-params": major
"postcss-minify-selectors": major
"postcss-normalize-charset": major
"postcss-normalize-display-values": major
"postcss-normalize-positions": major
"postcss-normalize-repeat-style": major
"postcss-normalize-string": major
"postcss-normalize-timing-functions": major
"postcss-normalize-unicode": major
"postcss-normalize-url": major
"postcss-normalize-whitespace": major
"postcss-ordered-values": major
"postcss-reduce-idents": major
"postcss-reduce-initial": major
"postcss-reduce-transforms": major
"postcss-svgo": major
"postcss-unique-selectors": major
"postcss-zindex": major
"stylehacks": major
---

The cssnano packages are now native ESM and require Node `^22.22.3 || ^24.15.0 || >=26.0`. Update imports to the documented package root entry points; package subpath imports are no longer supported. ESM consumers should use default imports. CommonJS consumers can continue using synchronous root `require()` on the supported Node versions, with the existing callable or object value shape. cssnano’s synchronous dynamic loading still supports CommonJS plugins, presets, and configuration files, but ESM-only dynamically selected modules are unsupported. See the migration documentation before upgrading.
