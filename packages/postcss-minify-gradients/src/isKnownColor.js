import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';

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
 * `postcss-merge-longhand` duplicates this list on purpose. */
export const dynamicColorKeywords = new Set([
  'currentcolor',
  'accentcolor',
  'accentcolortext',
  'activetext',
  'buttonborder',
  'buttonface',
  'buttontext',
  'canvas',
  'canvastext',
  'field',
  'fieldtext',
  'graytext',
  'highlight',
  'highlighttext',
  'linktext',
  'mark',
  'marktext',
  'selecteditem',
  'selecteditemtext',
  'visitedtext',
  // Deprecated system colors (CSS Color 3 / CSS Color 4 § 3.3.1)
  'activeborder',
  'activecaption',
  'appworkspace',
  'background',
  'buttonhighlight',
  'buttonshadow',
  'captiontext',
  'inactiveborder',
  'inactivecaption',
  'inactivecaptiontext',
  'infobackground',
  'infotext',
  'menu',
  'menutext',
  'scrollbar',
  'threeddarkshadow',
  'threedface',
  'threedhighlight',
  'threedlightshadow',
  'threedshadow',
  'window',
  'windowframe',
  'windowtext',
]);

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
