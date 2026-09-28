import cssnanoUtils from 'cssnano-utils';
import { syntaxAllowsPercentage } from './parseSyntax.js';
import { findReplacements, stripVendorPrefix } from './findReplacements.js';

const { applyEdits } = cssnanoUtils;

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

/** @typedef {import('./findReplacements.js').Options} Options */

/** @type {WeakMap<import('postcss').AtRule, boolean>} */
const atPropertySyntaxCache = new WeakMap();

/** @param {import('postcss').AtRule} parent @return {boolean} */
function atPropertyAllowsPercentage(parent) {
  const cached = atPropertySyntaxCache.get(parent);
  if (cached !== undefined) return cached;

  const syntaxDecl = /** @type {import('postcss').Declaration | undefined} */ (
    parent.nodes?.find(
      (node) => node.type === 'decl' && node.prop.toLowerCase() === 'syntax'
    )
  );
  const result = syntaxDecl ? syntaxAllowsPercentage(syntaxDecl.value) : true;
  atPropertySyntaxCache.set(parent, result);
  return result;
}

/** @param {import('postcss').Declaration} decl @return {boolean} */
function isInsideKeyframes(decl) {
  let current = decl.parent;
  while (current && current.type !== 'root') {
    if (
      current.type === 'atrule' &&
      /** @type {import('postcss').AtRule} */ (current).name
        .toLowerCase()
        .endsWith('keyframes')
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** @param {string} property @param {Options} opts @return {boolean} */
function skipsTransformation(property, opts) {
  return (
    property === 'unicode-range' ||
    (property.startsWith('--') && !opts.transformCustomProperties)
  );
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} lowerCasedProp
 * @param {string} strippedProp
 * @param {boolean | string[]} supportsIE
 * @return {import('./findReplacements.js').ReplacementFlags & { hasParentContext: boolean }}
 */
function getDeclarationFlags(decl, lowerCasedProp, strippedProp, supportsIE) {
  const isLineHeight = strippedProp === 'line-height';
  const isFlexBasis = flexBasisProperties.has(strippedProp);
  const isAtProperty =
    lowerCasedProp === 'initial-value' &&
    decl.parent?.type === 'atrule' &&
    /** @type {import('postcss').AtRule} */ (decl.parent).name.toLowerCase() ===
      'property';
  const isAlpha = alphaProperties.has(strippedProp);
  const isKeyframeProp = zeroUnitRetention.keyframePercent.has(strippedProp);
  const inKeyframes = (isKeyframeProp || isAlpha) && isInsideKeyframes(decl);
  const hasParentContext = lowerCasedProp === 'initial-value' || inKeyframes;

  const hasIESupport =
    typeof supportsIE === 'boolean'
      ? supportsIE
      : supportsIE.some((b) => b.startsWith('ie '));

  const keepZeroPercent =
    isLineHeight ||
    isFlexBasis ||
    zeroPercentRetention.has(strippedProp) ||
    (hasIESupport && zeroUnitRetention.ie11Percent.has(strippedProp)) ||
    (inKeyframes && isKeyframeProp) ||
    (isAtProperty &&
      atPropertyAllowsPercentage(
        /** @type {import('postcss').AtRule} */ (decl.parent)
      ));

  const keepZeroLength =
    isLineHeight ||
    isFlexBasis ||
    strippedProp === 'columns' ||
    strippedProp === 'flex-order' ||
    isAtProperty;

  const clampAlpha = !inKeyframes;
  const isFont = strippedProp === 'font';

  return {
    keepZeroPercent,
    keepZeroLength,
    clampAlpha,
    isAlpha,
    isFont,
    hasParentContext,
  };
}

/** @param {import('postcss').Declaration} decl @param {string} newValue @return {void} */
function updateDeclValue(decl, newValue) {
  decl.value = newValue;
  if (decl.raws?.value?.raw) {
    decl.raws.value = { raw: newValue, value: newValue };
  } else if (decl.raws?.value) {
    delete decl.raws.value;
  }
}

/** @param {import('postcss').Declaration} decl @return {string} */
function getRawOrDeclarationValue(decl) {
  const raw = decl.raws?.value;
  return raw?.raw && raw.value === decl.value ? raw.raw : decl.value;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} newValue
 * @param {string} originalValue
 * @return {void}
 */
function syncDeclValue(decl, newValue, originalValue) {
  const isStale = Boolean(
    decl.raws?.value && decl.raws.value.value !== decl.value
  );
  if (newValue !== originalValue || isStale) {
    updateDeclValue(decl, newValue);
  }
}

/** @param {Options} opts @param {boolean | string[]} supportsIE @param {import('postcss').Declaration} decl @param {Map<string, string>} [cache] @return {void} */
export default function transform(opts, supportsIE, decl, cache) {
  const lowerCasedProp = decl.prop.toLowerCase();
  const strippedProp = stripVendorPrefix(lowerCasedProp);
  if (skipsTransformation(strippedProp, opts)) return;
  const value = getRawOrDeclarationValue(decl);
  if (!/[0-9]/v.test(value)) return;

  const flags = getDeclarationFlags(
    decl,
    lowerCasedProp,
    strippedProp,
    supportsIE
  );

  const cacheKey = flags.hasParentContext
    ? undefined
    : `${lowerCasedProp}:${value}`;
  if (cacheKey !== undefined && cache?.has(cacheKey)) {
    const cached = /** @type {string} */ (cache.get(cacheKey));
    syncDeclValue(decl, cached, value);
    return;
  }

  const replacements = findReplacements(value, flags, opts);
  const result = replacements.length ? applyEdits(value, replacements) : value;
  if (cacheKey !== undefined) {
    cache?.set(cacheKey, result);
  }
  syncDeclValue(decl, result, value);
}
