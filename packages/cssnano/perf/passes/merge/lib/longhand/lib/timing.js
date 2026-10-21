const plugin = transformPlugin('mergeLonghand');
import { withTargets } from '../../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
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
