import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';

import { systemColors } from '../../values/systemColors.js';

extend([
  /** @type {import('@colordx/core').Plugin} */ (
    /** @type {unknown} */ (hwbPlugin)
  ),
  /** @type {import('@colordx/core').Plugin} */ (
    /** @type {unknown} */ (namesPlugin)
  ),
]);

/* A gradient stop may hold `currentColor` and the `<system-color>` keywords,
 * which resolve only at used-value time, so no colour parser can validate
 * them; the keyword list carries them. Plugin registration is process-global
 * and `postcss-colormin` shares it, so colordx loads only the plugins this
 * module needs — otherwise colormin would gamut-map wide-gamut colours.
 * Colour notations colordx cannot parse remain valid stop colours.
 * The set is `currentcolor` plus every shared system colour. */
export const dynamicColorKeywords = new Set(['currentcolor', ...systemColors]);

/**
 * Whether `color` is a `<color>` a gradient stop may hold, including the
 * keywords that only resolve at used-value time. Arguments beginning with a
 * function other than `calc()`, `clamp()`, `max()` or `min()` are treated as
 * colour stops without this check.
 *
 * @param {string} color
 * @returns {boolean}
 */
export default function isKnownColor(color) {
  return dynamicColorKeywords.has(color) || colord(color).isValid();
}
