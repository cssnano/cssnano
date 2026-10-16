---
title: Moving cssnano into a single package
author: cssnano team
excerpt: cssnano now ships its presets and plugins inside the cssnano package. The change makes your installs more secure and leaves you with fewer dependencies to review.
publishedAt: 2026-10-16
slug: single-package-migration
---

Installing cssnano used to install a whole family of related packages: the `cssnano` entry point, three presets, `cssnano-utils`, `stylehacks`, and 29 `postcss-*` plugins. From release 9.9.0, everything cssnano needs to minify CSS lives in the `cssnano` package. This change should improve the security of the cssnano install, as there are fewer packages to check for supply-chain compromises.

Your output should not change: the minified output should be identical to cssnano 9.8.0.

## Safer releases with staged publishing

Every cssnano release is now staged before it goes live: a maintainer must approve the release on npm and confirm it with two-factor authentication first.

For you, this means that a leaked automation token or a compromised build cannot push a new cssnano version into your project on its own. Each release you install has been approved by a person. This was harder to do before, because it required manually approving up to 36 different packages: with so many packages, it would have been easy for the maintainer to become distracted and approve a package they shouldn't have.

## Fewer dependencies to review

Installing cssnano with the default preset used to add about thirty cssnano packages to your dependency tree, each with its own version and changelog. Now it adds one.

Currently, the `cssnano` package depends only on `postcss-calc`, `browserslist`, `caniuse-api`, `@csstools/css-tokenizer` and `@colordx/core`. PostCSS is a peer dependency.

If you audit your dependencies, or review lockfile changes before you merge them, you now have far fewer packages to check. One version number and one changelog describe everything that changed in a cssnano release.

## What to check during migration

Most projects need no changes. Check these points if any of them apply to you.
These are mostly edge cases, which occur if you relied on the transitive dependencies of the `cssnano` package being available in your build.
- **Separately installed preset packages take precedence.** To preserve backward-compatibility, if `cssnano-preset-lite` or `cssnano-preset-advanced` is installed in your project, cssnano uses it instead of the built-in preset. cssnano prints a one-time `CSSNANO_INSTALLED_PRESET` warning. Uninstall the package to use the built-in preset, or pass the imported preset function to keep the installed one without the warning.
- The shorthand **`preset: 'default'` always uses the built-in preset.** Installed `cssnano-preset-default` packages are not used when using the shorthand.
- **Full preset package names fall back to the built-in preset.** If you write `cssnano-preset-default` and no `cssnano-preset-default` package is installed, cssnano uses its own copy.
- **Direct imports of `cssnano-preset-default` need an explicitly installed dependency.** If your code requires `cssnano-preset-default` with `import` or `require`, declare it as a dependency, or switch to `preset: ['default', {...}]`.
- **`overrides` and `resolutions` in `package.json` no longer apply to plugins.** Earlier, you could pin an individual `postcss-*` plugin to a specific version this way. Those plugins are now part of `cssnano`, so these pins have no effect.
- **Plugin packages receive no new releases.** Future versions of `postcss-colormin`, `postcss-merge-longhand` and the other plugins are not published under their old names. Configure the plugins through the `cssnano` preset, or the `cssnano` options, instead of depending on the individual packages.

If you hit a problem that isn't listed here, please [open an issue](https://github.com/cssnano/cssnano/issues) with your configuration and the output you expected.
