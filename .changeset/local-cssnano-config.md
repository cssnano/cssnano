---
"cssnano": major
---

cssnano now discovers configuration only in the current working directory, using `.cssnanorc.json` or `cssnano.config.js` in that order. The `cssnano` field in `package.json` is no longer supported. Parent-directory lookup, `.cssnanorc.js`, `.cssnanorc`, and extensionless configuration files are no longer automatic. Use `configFile` to select any configuration file in another directory. PostCSS configuration behavior is unchanged.
