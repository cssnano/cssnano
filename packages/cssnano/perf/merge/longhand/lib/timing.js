const plugin = onlyTransform(['mergeLonghand']);
import { withTargets } from '../../../../../../util/testHelpers.js';
import { onlyTransform } from '../../../../test/merge/onlyTransform.js';
import { timeOneRun } from '../../linearTiming.js';

/**
 * @param {string} css
 * @param {string} browsers
 * @return {number} one run of the whole plugin in milliseconds
 */
export function timePlugin(css, browsers) {
  const options = withTargets(browsers);
  return timeOneRun(() => plugin(options), css);
}
