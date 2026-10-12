---
title: SVG and URL changes in cssnano 9
author: cssnano team
excerpt: cssnano 9.8 no longer optimises inline SVG and rewrites URLs. Here's what's changed and how to update your build.
publishedAt: 2026-10-12
slug: svgo-and-url-changes
---

cssnano 9 changes how it handles SVG and URLs. Rendered output stays the same for valid CSS, but the minified text for inline SVG and URLs can differ, because cssnano no longer rewrites them.

The URL change makes URL handling more conservative, so cssnano doesn't alter how web servers and bundlers interpret your URLs.

## SVG optimisation is no longer in the default preset

The SVG optimiser pulls in large dependencies that the rest of cssnano doesn't need. Its benefit can also be small: in our tests on the repository's CSS fixtures, it sometimes saved no bytes at all.

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

To keep optimising SVG data URIs in your CSS, install `postcss-svgo` and run it before cssnano. With `configFile: true`, it finds an [SVGO](https://svgo.dev/) config file the same way the SVGO CLI does. Options passed to the plugin override the file's top-level options.

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

cssnano also keeps whitespace inside an `@namespace` string, because a namespace URI matches only its exact string.

## Check your URLs after upgrading

The old rewriting might have occasionally made an invalid URL valid by chance. If you see 404 Not Found or other server or bundler errors, check that your stylesheet URLs resolve the same way, and adjust the paths in your source files.

To be extra safe:
1. Check your built CSS for URLs that changed.
2. Watch for server errors after you deploy.
