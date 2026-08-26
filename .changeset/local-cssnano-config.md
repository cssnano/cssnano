---
"cssnano": major
---

cssnano now discovers configuration only in the current working directory, using `package.json`, `.cssnanorc.json`, `.cssnanorc.js`, or `cssnano.config.js` in that order. Parent-directory lookup, `.cssnanorc`, and extensionless configuration files are no longer supported. Use `configFile` to select a supported configuration file in another directory. PostCSS configuration behavior is unchanged.
