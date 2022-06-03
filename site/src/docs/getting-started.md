---
id: getting-started
title: Getting started
layout: layouts/MainLayout.njk
order: 2
---

## What is a build process?

A build process is a sequence of tasks, usually automated, that you run each
time that you want to deploy a new release of your application. cssnano fits
into this build process as a tool that should be run on your development CSS,
and in turn will create compressed production assets. These are then uploaded
to your production server or CDN.

There are a number of different ways that you can compose a build process; we
recommend using the command line, but you might also want to consider an
abstraction such as [gulp](https://gulpjs.com/), especially for more complex
systems.


## Installing Node.js & npm

cssnano is installed using the command line, using [npm](https://npmjs.com); so
you will need to use an application such as Terminal or the Windows Command
Prompt. If you don't already have Node.js installed, then you'll need to
install it.

We require a minimum of Node.js version 10.13.0  to run, and we
recommend that you install [nvm](https://github.com/creationix/nvm) to manage
your Node.js versions.

Alternately, you can [visit the Node.js website](https://nodejs.org/en/) and
follow the instructions there to install it for your machine.

cssnano is a [PostCSS](https://postcss.org/) plugin, so running cssnano also requires installing PostCSS. 
Once you have installed Node.js & npm, you can run this command to install
cssnano and PostCSS into your project:

```shell
npm install cssnano postcss --save-dev
```

Note that for most typical setups, we recommend that you compress your CSS
during your deployment step, so that when it is uploaded to your server/CDN
it is already optimized. In most cases, you should not need to install cssnano
on your web server.


## Using PostCSS CLI

Once you have cssnano installed, you will need a PostCSS runner in order to
use it to compress your CSS files. We recommend the PostCSS command line module,
but you can use any of the alternatives listed in the next section.

You can install [PostCSS CLI](https://github.com/postcss/postcss-cli)
with this command:

```shell
npm install --save-dev postcss-cli
```

Once you have done this, you will need to configure cssnano by creating a
`postcss.config.js` file in the root of your project. This should contain
cssnano as well as any other [plugins] that you might want for your project;
as an example:

[plugins]: https://github.com/postcss/postcss/blob/main/docs/plugins.md

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: 'default',
        }),
    ],
};
```

_Read more about presets in [our presets guide](/docs/presets)._

You can now minify your CSS files! Try it out by creating a CSS file in your
project named `input.css`, with some styles in there. Then, run:

```shell
npx postcss input.css > output.css
```

You should then see an `output.css` with the same styles but compressed!

Note that you can also find a [basic example][example] in our GitHub repository.

[example]: https://github.com/cssnano/cssnano/tree/master/example-cli-usage


## Alternatives to using the CLI

You can also use any of the other available PostCSS runners to manage your
CSS compression; these are the most common.

### Grunt

Use [grunt-postcss](https://github.com/nDmitry/grunt-postcss).

### Gulp

Use [gulp-postcss](https://github.com/postcss/gulp-postcss).

### Webpack

You can use cssnano explicitly with [postcss-loader].

[postcss-loader]: https://github.com/postcss/postcss-loader

You can also use the cssnano with [webpack plugin](https://github.com/webpack-contrib/css-minimizer-webpack-plugin)

### Others

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
other available runners.
