---
title: Moving cssnano into a single package
author: cssnano team
excerpt: cssnano now ships its presets and plugins inside the cssnano package. This post explains how the change makes your installs more secure, leaves you fewer dependencies to review, and what to check in your project.
publishedAt: 2026-10-16
slug: single-package-migration
---

cssnano used to be a family of packages: the `cssnano` entry point, three presets, `cssnano-utils`, `stylehacks`, and 29 `postcss-*` plugins. From the next release, everything cssnano needs to minify CSS lives in the `cssnano` package. Only `postcss-svgo` is still published separately.

Your output should not change: the minified output should be identical to cssnano 9.8.0.

## Safer releases with staged publishing

Every cssnano release is now staged before it goes live. Our release workflow prepares the package, but it cannot make it available on npm by itself. A maintainer must approve the release on npm and confirm it with two-factor authentication first.

For you, this means that a leaked automation token or a compromised build cannot push a new cssnano version into your project on its own. Each release you install has been approved by a person.

## Fewer dependencies to review

Installing cssnano with the default preset used to add about thirty cssnano packages to your dependency tree, each with its own version and changelog. Now it adds one.

The `cssnano` package depends only on `postcss-calc`, `browserslist`, `caniuse-api`, `@csstools/css-tokenizer` and `@colordx/core`. PostCSS is a peer dependency, so your project supplies the version it already uses.

If you audit your dependencies, or review lockfile changes before you merge them, you now have far fewer packages to check. One version number and one changelog describe everything that changed in a cssnano release.

## What to check during migration

Most projects need no changes. Check these points if any of them apply to you.

- **Installed preset packages take precedence.** If `cssnano-preset-lite` or `cssnano-preset-advanced` is installed in your project, cssnano uses it instead of the built-in preset. cssnano prints a one-time `CSSNANO_INSTALLED_PRESET` warning. Uninstall the package to use the built-in preset, or pass the imported preset function to keep the installed one without the warning.
- **`preset: 'default'` always uses the built-in preset.** Installed `cssnano-preset-default` packages are not used for that name.
- **Full preset package names fall back to the built-in preset.** If you write `cssnano-preset-default` and no package is installed, cssnano uses its own copy.
- **Direct imports of `cssnano-preset-default` need a dependency.** If your code requires `cssnano-preset-default` itself, declare it as a dependency, or switch to `preset: ['default', {...}]`.
- **`overrides` and `resolutions` no longer apply to plugins.** Earlier, you could pin an individual `postcss-*` plugin this way. Those plugins are now part of `cssnano`, so these pins have no effect.
- **Plugin packages receive no new releases.** Future versions of `postcss-colormin`, `postcss-merge-longhand` and the other plugins are not published under their old names. Configure the plugins through the `cssnano` preset, or the `cssnano` options, instead of depending on the individual packages.
- **Install PostCSS yourself.** It is a peer dependency, so check that your project provides a compatible version.

If you hit a problem that isn't listed here, please [open an issue](https://github.com/cssnano/cssnano/issues) with your configuration and the output you expected.
