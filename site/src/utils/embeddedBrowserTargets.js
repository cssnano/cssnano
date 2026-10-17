/**
 * Replaces cssnano's browser targets module in the site build, so the
 * playground does not bundle browserslist's data. The targets are the list
 * that astro.config.mjs resolved at build time, so output does not depend on
 * the visitor's clock.
 */

/**
 * The key that a preset sets for the browser targets. The embedded targets
 * ignore the options, so a symbol of this module is enough for the site build.
 */
export const browserTargets = Symbol('cssnano.browserTargets');

/** @type {readonly string[] | undefined} */
let embeddedTargets;

/** @return {readonly string[]} */
export function resolveTargets() {
  // Without the define, an empty list would silently switch off every
  // support-dependent optimization, so fail where the cause is visible.
  if (typeof CSSNANO_PLAYGROUND_TARGETS === 'undefined') {
    throw new TypeError(
      'CSSNANO_PLAYGROUND_TARGETS is not defined; the build must define it.'
    );
  }
  embeddedTargets ??= Object.freeze([...CSSNANO_PLAYGROUND_TARGETS]);
  return embeddedTargets;
}
