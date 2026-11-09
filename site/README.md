
# Website

This website is built using [Astro](https://astro.build/).

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

This command generates static content into `dist/` and can be served using any static content hosting service.

### Check

```
$ pnpm check:astro
```

This command builds the site and verifies the generated artifacts. In `site/`, `pnpm test` runs the site's unit tests and type checking; the repository's `pnpm test` runs only its unit tests.

Pages and components live in `src/pages`, `src/components`, and `src/layouts`. Markdown content is loaded through Astro content collections, including documentation sourced from the repository.
