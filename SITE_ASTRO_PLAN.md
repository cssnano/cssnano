# Validate Vite/Rolldown for the Playground

## Summary

Create a standalone Vite/Rolldown bundling prototype before changing Eleventy or adopting Astro. Preserve the existing `playground.js` worker and dynamic preset imports, then compare the generated artifacts and browser loading behavior against the current Webpack build.

Vite directly supports the existing worker pattern and exposes the underlying Rolldown worker and code-splitting configuration:

- https://vite.dev/guide/features
- https://vite.dev/config/build-options

## Implementation Changes

- Keep the existing `REFACTOR_PLAN.md` untouched.
- Capture a Webpack baseline from `site/webpack.config.js`:
  - initial chunk count and bytes;
  - immediately requested worker chunk;
  - dynamically loaded preset chunks;
  - gzip/Brotli sizes;
  - browser request waterfall.
- Add a temporary or isolated Vite build configuration targeting `site/src/playground.js`.
- Keep the existing source unchanged initially, including:
  - `new Worker(new URL('./playground-worker.js', import.meta.url), { type: 'module' })`;
  - the three static dynamic imports in `playground-minifier.js`;
  - the SVGO browser alias.
- Configure Vite/Rolldown to preserve:
  - ES-module output;
  - a separate worker bundle;
  - lazy preset loading;
  - stable `playground.bundle.js` output;
  - predictable named vendor/SVGO chunks;
  - an output directory compatible with the existing Eleventy-generated site.
- Use Rolldown’s explicit code-splitting groups where automatic splitting does not reproduce the Webpack graph. Treat `maxSize` as a target, not a hard limit:
  - https://rolldown.rs/in-depth/manual-code-splitting
- Do not migrate the full site to Astro until the standalone bundling prototype passes the performance checks.

## Test Plan

- Run the existing site unit and type tests.
- Build both Webpack and Vite/Rolldown production bundles from clean output directories.
- Verify the playground in a browser:
  - worker creation succeeds;
  - all three presets minimize CSS correctly;
  - syntax errors and worker failures retain current behavior;
  - the first page load does not fetch preset code prematurely.
- Compare Vite/Rolldown against Webpack:
  - initial request count must not exceed the current two initial chunks;
  - initial transferred bytes must not increase by more than 5%;
  - worker request timing and size must not regress materially;
  - first-use preset request count and transferred bytes must not increase by more than 5%;
  - generated bundle output must remain below the current performance warning thresholds.
- Add a build-time artifact check that fails if initial requests or measured size budgets regress.
- Only after this succeeds, evaluate integrating the configuration into Astro.

## Assumptions

- The first phase evaluates bundling only; it does not rewrite Nunjucks templates or migrate Eleventy.
- The current Webpack build is the performance baseline, including its intentional worker request and approximately 244 kB chunk-size target.
- A small improvement in build speed or total output is not sufficient by itself; browser loading behavior and lazy preset loading must remain equivalent.
