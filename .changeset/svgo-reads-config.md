---
"postcss-svgo": minor
---

feat(postcss-svgo): add the `configFile` option to read the svgo configuration from svgo.config.js

The `datauri` option is now ignored, because it only makes sense for the SVGO command line: in the plugin, it produced a data URI nested inside the original one.
