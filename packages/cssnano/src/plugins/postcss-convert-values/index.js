import { anyAffected } from '#utils/browser-bugs';
import {
  hasContextBit,
  IN_KEYFRAMES,
  IN_PROPERTY,
  PERCENTAGE_SYNTAX,
} from '../../pipeline/context.js';
import { findReplacements, stripVendorPrefix } from './lib/findReplacements.js';
import { containsUnicodeRange } from './lib/unicodeRange.js';

/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */
/** @import {ReplacementFlags} from './lib/findReplacements.js' */
/** @typedef {import('./lib/findReplacements.js').Options} Options */

const flexBasisProperties = new Set([
  'flex',
  'flex-basis',
  'flex-basic',
  'flex-preferred-size',
]);

const alphaProperties = new Set([
  'opacity',
  'shape-image-threshold',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
  'flood-opacity',
]);

const zeroPercentRetention = new Set([
  'descent-override',
  'ascent-override',
  'font-stretch',
  'font-width',
  'size-adjust',
  'line-gap-override',
  'text-size-adjust',
  'subscript-position-override',
  'superscript-position-override',
  'subscript-size-override',
  'superscript-size-override',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-width',
]);

const zeroUnitRetention = {
  ie11Percent: new Set(['max-height', 'height', 'min-width']),
  keyframePercent: new Set([
    'border-image-width',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
  ]),
};

/**
 * @param {string} property the lowercased property, without a vendor prefix
 * @param {Options} opts
 * @return {boolean}
 */
function skipsTransformation(property, opts) {
  return (
    property === 'unicode-range' ||
    (property.startsWith('--') && !opts.transformCustomProperties)
  );
}

/**
 * @param {string} strippedProp
 * @param {boolean} isLineHeight
 * @param {boolean} isFlexBasis
 * @param {boolean} hasIESupport
 * @param {boolean} inKeyframes
 * @param {boolean} isKeyframeProp
 * @param {boolean} allowsAtPropertyPercentage
 * @return {boolean}
 */
function shouldKeepZeroPercent(
  strippedProp,
  isLineHeight,
  isFlexBasis,
  hasIESupport,
  inKeyframes,
  isKeyframeProp,
  allowsAtPropertyPercentage
) {
  if (isLineHeight || isFlexBasis || zeroPercentRetention.has(strippedProp)) {
    return true;
  }
  if (hasIESupport && zeroUnitRetention.ie11Percent.has(strippedProp)) {
    return true;
  }
  if (inKeyframes && isKeyframeProp) {
    return true;
  }
  return allowsAtPropertyPercentage;
}

/**
 * @param {string} strippedProp
 * @param {boolean} isLineHeight
 * @param {boolean} isFlexBasis
 * @param {boolean} isAtProperty
 * @return {boolean}
 */
function shouldKeepZeroLength(
  strippedProp,
  isLineHeight,
  isFlexBasis,
  isAtProperty
) {
  return (
    isLineHeight ||
    isFlexBasis ||
    strippedProp === 'columns' ||
    strippedProp === 'flex-order' ||
    isAtProperty
  );
}

/**
 * @param {string} lowerCasedProp
 * @param {string} strippedProp
 * @param {number} context the context bits of the declaration
 * @param {boolean} supportsIE
 * @return {ReplacementFlags}
 */
function flagsOf(lowerCasedProp, strippedProp, context, supportsIE) {
  const isLineHeight = strippedProp === 'line-height';
  const isFlexBasis = flexBasisProperties.has(strippedProp);
  const isAtProperty =
    lowerCasedProp === 'initial-value' && hasContextBit(context, IN_PROPERTY);
  const isAlpha = alphaProperties.has(strippedProp);
  const isKeyframeProp = zeroUnitRetention.keyframePercent.has(strippedProp);
  const inKeyframes =
    (isKeyframeProp || isAlpha) && hasContextBit(context, IN_KEYFRAMES);
  const allowsAtPropertyPercentage =
    isAtProperty && hasContextBit(context, PERCENTAGE_SYNTAX);

  return {
    keepZeroPercent: shouldKeepZeroPercent(
      strippedProp,
      isLineHeight,
      isFlexBasis,
      supportsIE,
      inKeyframes,
      isKeyframeProp,
      allowsAtPropertyPercentage
    ),
    keepZeroLength: shouldKeepZeroLength(
      strippedProp,
      isLineHeight,
      isFlexBasis,
      isAtProperty
    ),
    clampAlpha: !inKeyframes,
    isAlpha,
    isFont: strippedProp === 'font',
    isCustomProperty: strippedProp.startsWith('--'),
  };
}

/**
 * The stage for one run. It converts the lengths, times, angles and frequencies
 * of every property it does not skip, with the target support for IE zero units.
 *
 * @param {Options} options
 * @param {readonly string[] | undefined} browsers
 * @return {Stage}
 */
function compileConvertValues(options, browsers) {
  const supportsIE = anyAffected(
    /** @type {readonly string[]} */ (browsers),
    'ie-zero-unit-retention'
  );
  return {
    forProperty(property) {
      const lowerCasedProp = property.toLowerCase();
      const strippedProp = stripVendorPrefix(lowerCasedProp);
      if (skipsTransformation(strippedProp, options)) return null;
      /** @type {Reducer} */
      const reduce = (buffer, context) => {
        // Before an edit the text is the source, so a digit check costs no
        // serialization; after one, the tokens hold the digits.
        if (!buffer.isEdited() && !/[0-9]/v.test(buffer.text())) return;
        const flags = flagsOf(
          lowerCasedProp,
          strippedProp,
          context,
          supportsIE
        );
        // A custom property may hold a `U+` range, which only `unicode-range`
        // reads as one token, so no edit is safe for it.
        if (flags.isCustomProperty && containsUnicodeRange(buffer)) {
          return;
        }
        buffer.replaceRanges(findReplacements(buffer.tokens(), flags, options));
      };
      return reduce;
    },
  };
}

/** @satisfies {StageEntry} */
const convertValues = { create: compileConvertValues };

export { convertValues as default };
