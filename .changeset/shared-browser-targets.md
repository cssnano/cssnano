---
"cssnano": major
---

feat(cssnano)!: resolve one set of browser targets for every plugin, defaulting to Baseline widely available

Every plugin that depends on browser support reads one resolver, so the plugins of a preset judge a file against the same browsers. Targets come from `browserslist.query`, then the project's browserslist config or `BROWSERSLIST`, and otherwise from `baseline widely available with downstream`. Projects without a config previously got browserslist's `defaults`, and now get the Baseline targets, which allow more optimizations, such as merging alignment longhands into `place-*` shorthands. A query that matches no browser turns off every support-dependent optimization and adds a PostCSS warning.

Output may stop working in browsers that `defaults` includes but Baseline does not, such as Opera Mini, UC Browser, QQ Browser, KaiOS, Opera Mobile and Chrome 109. To keep the previous targets, add a browserslist config with `defaults`, or pass `browserslist: { query: 'defaults' }`.

Baseline is counted back from the current date, so the default targets move over time, and the same code can produce different output months later. Reproducible builds should pin the targets, such as `baseline widely available on 2026-10-01 with downstream`.

Feature support is read from `caniuse-lite`, which replaces `caniuse-api`. A feature that needs a vendor prefix, such as unprefixed `:autofill` for chrome 8, counts as unsupported, and so does a target that caniuse-lite does not list. The browserslist config is searched from the PostCSS `from` or `file` option, or the working directory when neither is set. `browserslist.path` overrides that search directory, and `browserslist.config` names the config file to read. The browserslist options `ignoreUnknownVersions`, `mobileToDesktop` and `throwOnMissing` are forwarded, and `dangerousExtend` throws. The top-level `path` option is removed; use `browserslist.path`.

The documentation site's playground embeds the targets that the default query resolves at build time. It runs the same checks as the Node build, but ignores `browserslist.query`.
