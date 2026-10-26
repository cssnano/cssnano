import { supportsAll } from '#utils/browser-support';
import {
  DEFAULT_NAMESPACE,
  hasContextBit,
  KEYFRAME_RULE,
} from '../../pipeline/context.js';
import { isFixedPointSelector } from './lib/fixedPointSelector.js';
import { isInvalidSelector } from './lib/isInvalidSelector.js';
import { normalizeListTokens } from './lib/selectorScanner.js';

/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

/**
 * @typedef {object} Options
 * @property {boolean} [sort] Sorts the selectors of a list alphabetically. (default: true)
 * @property {boolean} [convertToIs] Factors a shared prefix or suffix of a selector list into `:is()` when that is shorter and keeps the cascade. (default: true)
 */

/**
 * The stage for one run. Its selector reducer minifies each selector list; the
 * walk supplies the context that says whether a default `@namespace` precedes
 * the rule and whether it sits directly in keyframes.
 *
 * @param {Options} options
 * @param {readonly string[]} targets
 * @returns {Stage}
 */
function selectorStage(options, targets) {
  const resolved = { sort: true, convertToIs: true, ...options };
  const fold =
    resolved.convertToIs !== false &&
    supportsAll(targets, 'css-matches-pseudo');
  /** @type {Reducer} */
  const reduceSelector = (buffer, context) => {
    const source = buffer.text();
    if (source.at(-1) === ':') return;
    const inKeyframes = hasContextBit(context, KEYFRAME_RULE);
    const hasDefaultNamespace = hasContextBit(context, DEFAULT_NAMESPACE);
    if (!inKeyframes && !hasDefaultNamespace && isFixedPointSelector(source)) {
      return;
    }
    const tokens = buffer.tokens();
    const normalized = normalizeListTokens(
      source,
      tokens,
      resolved.sort,
      fold,
      inKeyframes,
      hasDefaultNamespace
    );
    if (normalized.text !== source)
      buffer.replace(0, tokens.length, normalized.tokens);
  };
  return { selector: reduceSelector };
}

/** @satisfies {StageEntry} */
const minifySelectors = {
  create: (options, targets) =>
    selectorStage(
      /** @type {Options} */ (options),
      /** @type {readonly string[]} */ (targets)
    ),
};

export { minifySelectors as default, isInvalidSelector };
