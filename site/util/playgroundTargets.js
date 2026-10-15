import {
  defaultTargetsQuery,
  resolveTargets,
} from '../../packages/cssnano/src/utils/browserTargets.js';

/**
 * cssnano's default targets, resolved once when the site builds. The
 * playground passes them as explicit versions, so every visitor gets the
 * targets of the deployed build, whatever the date in their browser.
 * @return {string[]}
 */
export function resolvePlaygroundTargets() {
  return [
    ...resolveTargets({ overrideBrowserslist: defaultTargetsQuery }, undefined),
  ];
}
