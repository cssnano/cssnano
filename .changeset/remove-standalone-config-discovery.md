---
"cssnano": major
---

Remove standalone configuration file discovery (`.cssnanorc*`, `cssnano.config.*`, and `package.json#cssnano`) and the `configFile` option; pass configuration directly to `cssnano(options)` or in `postcss.config.mjs`. When both `preset` and `plugins` are supplied, cssnano now runs the preset and the extra plugins together. Previously a preset given as a string or factory was silently dropped whenever `plugins` was also passed, so only the extra plugins ran; cssnano now composes them consistently. Directory-based and contextual configuration switching should now be handled through PostCSS runner features (such as `postcss.config.mjs` functions receiving context or per-directory PostCSS config files).
