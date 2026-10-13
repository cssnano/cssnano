---
title: SVG and URL changes in cssnano 9.8
author: cssnano team
excerpt: cssnano 9.8 no longer optimises inline SVG (Scalable Vector Graphics) and rewrites URLs (Uniform Resource Locators). Here's what's changed and how to update your build.
publishedAt: 2026-10-12
slug: svgo-and-url-changes
---

cssnano 9.8 changes how it handles [SVG (Scalable Vector Graphics)](https://developer.mozilla.org/en-US/docs/Web/SVG) and URLs (Uniform Resource Locators). Rendered output stays the same for valid CSS (Cascading Style Sheets), but the minified text for inline SVG and URLs can differ.

The URL change makes URL handling more conservative, so cssnano doesn't alter how web servers and bundlers interpret your URLs.

## SVG optimisation is no longer in the default preset

In previous releases, cssnano used by default the [SVGO](https://svgo.dev/) optimiser to minimise SVG images inserted in the stylesheet through so-called data URLs.
The SVGO optimiser pulls in large dependencies that the rest of cssnano doesn't need, but its benefit can be small: in our tests on the repository's CSS fixtures, it sometimes saved no bytes at all, even on stylesheets containing inline SVG images.

cssnano-preset-default no longer includes SVG optimisation, and it ignores the `svgo` option whatever value you pass. Remove the option:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default'],
        }),
    ],
};
```

To keep optimising SVG data URIs (Uniform Resource Identifiers) in your CSS, install `postcss-svgo` and run it before cssnano. With `configFile: true`, it looks for an [SVGO config file](https://github.com/svg/svgo) the same way the SVGO command-line interface (CLI) does. Options passed to the plugin override the file's top-level options.

```sh
npm install -D postcss-svgo
```

```js
module.exports = {
    plugins: [
        require('postcss-svgo')({ configFile: true }),
        require('cssnano'),
    ],
};
```

Optimise each SVG before you inline it, for example with the SVGO CLI or your build tool's SVGO integration. This avoids decoding, optimising, and re-encoding the SVG inside cssnano, which likely is more efficient and allows you to better track the changes to your image assets.

## Conservative URL rewriting

`postcss-normalize-url` now changes only the `url()` token. It unquotes, trims, and escapes the token, and it chooses between quoted and unquoted forms, whichever is shorter. It leaves data URLs unchanged.

It no longer changes how a URL resolves, to avoid breaking the URLs in the stylesheets. cssnano keeps these as written:

- dot segments (`./` and `../`)
- duplicate slashes
- default ports
- percent-escapes
- a trailing dot in the host

On some servers and bundlers, these changes can point to a different resource, so cssnano leaves them alone.

cssnano also keeps whitespace inside [a `@namespace` string](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@namespace), because a namespace URI matches only its exact string.

## Check your URLs after upgrading

The old rewriting might have occasionally made an invalid URL valid by chance. If you see 404 Not Found or other server or bundler errors, check that your stylesheet URLs resolve the same way, and adjust the paths in your source files.

To be extra safe:
1. Check your built CSS for URLs that changed.
2. Watch for server errors after you deploy.
