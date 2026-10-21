import postcss from 'postcss';
const plugin = transformPlugin('mergeLonghand');
import { withTargets } from '../../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';

/**
 * @param {() => void} work
 * @return {number} best of two runs in milliseconds, so one GC pause does not decide
 */
function bestOfTwo(work) {
  const run = () => {
    const start = performance.now();
    work();
    return performance.now() - start;
  };
  return Math.min(run(), run());
}

/**
 * @param {string} css
 * @param {string} browsers
 * @return {number} best of two runs of the whole plugin in milliseconds
 */
export function timePlugin(css, browsers) {
  const options = withTargets(browsers);
  return bestOfTwo(() => {
    postcss([plugin(options)])
      .process(css, { from: undefined })
      .sync();
  });
}
