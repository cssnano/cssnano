---
"cssnano": major
---

feat(cssnano)!: resolve one set of browser targets for every plugin, defaulting to Baseline widely available

All plugins that depend on browser support now share one resolver, so the plugins of a preset judge a file against the same browsers. The targets come from `overrideBrowserslist`, then the project's browserslist config or `BROWSERSLIST` environment variable, and otherwise from `baseline widely available with downstream`. Projects without a browserslist config previously got browserslist's `defaults`; they now get the Baseline targets, which allow more optimizations, such as merging alignment longhands into `place-*` shorthands. A query that matches no browser keeps every support-dependent optimization off and adds a PostCSS warning.

This is a breaking change for projects without a browserslist config: the output may no longer work in browsers that `defaults` includes but the Baseline targets do not, such as Opera Mini, UC Browser, QQ Browser, KaiOS, Opera Mobile and Chrome 109. To keep the previous targets, add a browserslist config with `defaults`, or pass `overrideBrowserslist: 'defaults'`.

The browser build no longer uses a fixed list of targets and a precomputed support table. It runs the same resolver and support checks as the Node build, with browserslist's client-side build, so it honours `overrideBrowserslist` and lowercases the `U+` prefix of `unicode-range` for modern targets.

Feature support is read from `caniuse-lite`, which replaces the `caniuse-api` dependency, and only the features cssnano checks are imported. A feature that needs a vendor prefix, such as unprefixed `:autofill` for chrome 8, is now treated as unsupported, and so is a target that caniuse-lite does not list.

The search for a browserslist config starts at the `from` or `file` of the PostCSS options, and at the working directory when neither is set, instead of the directory where cssnano is installed.
