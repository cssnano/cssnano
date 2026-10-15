/**
 * The targets that astro.config.mjs resolves when the site builds. Outside a
 * Vite build, such as in the tests, cssnano resolves its defaults itself.
 * @type {string[] | undefined}
 */
export const playgroundTargets =
  typeof CSSNANO_PLAYGROUND_TARGETS === 'undefined'
    ? undefined
    : CSSNANO_PLAYGROUND_TARGETS;
