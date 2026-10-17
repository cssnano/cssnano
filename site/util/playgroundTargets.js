import {
  browserTargets,
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
  const targets = [
    ...resolveTargets(
      { [browserTargets]: { query: defaultTargetsQuery } },
      undefined
    ),
  ];
  // An empty list would silently switch off every support-dependent
  // optimization in the playground.
  if (targets.length === 0) {
    throw new Error(
      `The playground targets query ${JSON.stringify(defaultTargetsQuery)} matches no browser.`
    );
  }
  return targets;
}
