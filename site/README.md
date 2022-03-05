
# Website

This website is built using the [Eleventy](https://www.11ty.dev/) static website generator.

### Installation

```
$ pnpm install
```

### Local Development

```
$ pnpm start
```

This command starts a local development server and opens a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.


Most pages are built with the templates in `src/_includes`, which use the [Nunjucks](https://mozilla.github.io/nunjucks/) template language. The Changelog and Contributing pages are included directly from the cssnano package in the repository.

The `webpack.config.js` file contains the webpack configuration to bundle the Playground page.

`util/buildMetadata.mjs` retrieves the cssnano plugin metadata and outputs in an Eleventy data file, which Eleventy uses to generate the individual optimisation pages.
