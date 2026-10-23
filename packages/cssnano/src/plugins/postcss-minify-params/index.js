import { anyAffected } from '#utils/browser-bugs';
import reduceParams from './lib/transform.js';

/** @import {AtRulePart, Stage, StageEntry} from '../../pipeline/host.js' */

/**
 * @typedef {object} Options
 */

/**
 * The stage for one run. It rewrites the preludes of `@media` and `@supports`,
 * and asks the walk to tighten the space after the name of each.
 *
 * @param {readonly string[]} targets
 * @returns {Stage}
 */
function paramsStage(targets) {
  const legacy = anyAffected(targets, 'media-all-ie11');
  /** @type {AtRulePart} */
  const media = {
    reduce: (text) => reduceParams(legacy, 'media', text),
    tightensAfterName: true,
  };
  /** @type {AtRulePart} */
  const supports = {
    reduce: (text) => reduceParams(legacy, 'supports', text),
    tightensAfterName: true,
  };
  return {
    forAtRule(name) {
      const lowerCased = name.toLowerCase();
      if (lowerCased === 'media') return media;
      if (lowerCased === 'supports') return supports;
      return null;
    },
  };
}

/** @satisfies {StageEntry} */
const minifyParams = {
  create: (/** @type {Options} */ _options, targets) =>
    paramsStage(/** @type {readonly string[]} */ (targets)),
};

export { minifyParams as default };
