import minimumVersions from '../../data/placeSupport.json' with { type: 'json' };
import { compareVersions } from '../compareVersions.js';

/**
 * Whether every target supports all place-* shorthands. An engine without
 * them drops the whole declaration, losing both axes that separate longhands
 * would have kept, so a target without compatibility data counts as lacking
 * support.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {boolean}
 */
export function supportsPlaceShorthands(browsers) {
  return browsers.every((entry) => {
    const [name, version] = entry.split(' ');
    const minimum = /** @type {Record<string, string>} */ (minimumVersions)[
      name
    ];
    if (minimum === undefined) return false;
    if (version === 'TP') return true;
    const lowest = version.split('-')[0];
    return (
      /^\d+(?:\.\d+)*$/v.test(lowest) && compareVersions(lowest, minimum) >= 0
    );
  });
}
