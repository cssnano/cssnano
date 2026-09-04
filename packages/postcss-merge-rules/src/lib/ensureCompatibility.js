import caniuseApi from 'caniuse-api';
import { tokenizer, TokenType } from '@csstools/css-tokenizer';

const { isSupported } = caniuseApi;
const simpleSelectorRe = /^#?[-._a-z0-9 ]+$/i;

const cssSel2 = 'css-sel2';
const cssSel3 = 'css-sel3';
const cssGencontent = 'css-gencontent';
const cssFirstLetter = 'css-first-letter';
const cssFirstLine = 'css-first-line';
const cssInOutOfRange = 'css-in-out-of-range';
const formValidation = 'form-validation';

const vendorPrefix =
  /-(ah|apple|atsc|epub|hp|khtml|moz|ms|o|rim|ro|tc|wap|webkit|xv)-/;

const level2Sel = new Set(['=', '~=', '|=']);
const attributeOperatorCharacters = new Set(['~', '|', '^', '$', '*']);

/**
 * @param {string} selector
 * @return {RegExpMatchArray | null}
 */
function filterPrefixes(selector) {
  return selector.match(vendorPrefix);
}

const inputPlaceholderRegex = /-ms-input-placeholder/i;
/**
 * Internet Explorer use :-ms-input-placeholder.
 * Microsoft Edge use ::-ms-input-placeholder.
 *
 * @type {(selector: string) => boolean}
 */
const findMsInputPlaceholder = (selector) =>
  inputPlaceholderRegex.test(selector);

/**
 * @param {string[]} selectorsA
 * @param {string[]} selectorsB
 * @return {boolean}
 */
function sameVendor(selectorsA, selectorsB) {
  /** @type {(selectors: string[]) => string} */
  const same = (selectors) => selectors.map(filterPrefixes).join();
  /** @type {(selectors: string[]) => string | undefined} */
  const findMsVendor = (selectors) => selectors.find(findMsInputPlaceholder);
  return (
    same(selectorsA) === same(selectorsB) &&
    !(findMsVendor(selectorsA) && findMsVendor(selectorsB))
  );
}

/**
 * @param {string} selector
 * @return {boolean}
 */
function noVendor(selector) {
  return !vendorPrefix.test(selector);
}

const pseudoElements = {
  ':active': cssSel2,
  ':after': cssGencontent,
  ':any-link': 'css-any-link',
  ':before': cssGencontent,
  ':checked': cssSel3,
  ':default': 'css-default-pseudo',
  ':dir': 'css-dir-pseudo',
  ':disabled': cssSel3,
  ':empty': cssSel3,
  ':enabled': cssSel3,
  ':first-child': cssSel2,
  ':first-letter': cssFirstLetter,
  ':first-line': cssFirstLine,
  ':first-of-type': cssSel3,
  ':focus': cssSel2,
  ':focus-within': 'css-focus-within',
  ':focus-visible': 'css-focus-visible',
  ':has': 'css-has',
  ':hover': cssSel2,
  ':in-range': cssInOutOfRange,
  ':indeterminate': 'css-indeterminate-pseudo',
  ':invalid': formValidation,
  ':is': 'css-matches-pseudo',
  ':lang': cssSel2,
  ':last-child': cssSel3,
  ':last-of-type': cssSel3,
  ':link': cssSel2,
  ':matches': 'css-matches-pseudo',
  ':not': cssSel3,
  ':nth-child': cssSel3,
  ':nth-last-child': cssSel3,
  ':nth-last-of-type': cssSel3,
  ':nth-of-type': cssSel3,
  ':only-child': cssSel3,
  ':only-of-type': cssSel3,
  ':optional': 'css-optional-pseudo',
  ':out-of-range': cssInOutOfRange,
  ':placeholder-shown': 'css-placeholder-shown',
  ':required': formValidation,
  ':root': cssSel3,
  ':target': cssSel3,
  '::after': cssGencontent,
  '::backdrop': 'dialog',
  '::before': cssGencontent,
  '::first-letter': cssFirstLetter,
  '::first-line': cssFirstLine,
  '::marker': 'css-marker-pseudo',
  '::placeholder': 'css-placeholder',
  '::selection': 'css-selection',
  ':valid': formValidation,
  ':visited': cssSel2,
};

/**
 * @param {string} selector
 * @return {boolean}
 */
function isCssMixin(selector) {
  return selector[selector.length - 1] === ':';
}

/**
 * @param {string} selector
 * @return {boolean}
 */
function isHostPseudoClass(selector) {
  return selector.includes(':host');
}

/** @type {WeakMap<string[], Map<string, boolean>>} */
const isSupportedCache = new WeakMap();
// Stable stand-in key when `browsers` is undefined, since a fresh `[]` on
// every call would never hit the WeakMap.
/** @type {string[]} */
const noBrowsers = [];

// Move to util in future
/**
 * `browsers` is the same array reference for an entire file's processing, so
 * keying on it directly (rather than re-serializing it per call) avoids
 * rebuilding a JSON string on every lookup, including cache hits.
 *
 * @param {string} feature
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function isSupportedCached(feature, browsers) {
  const key = browsers ?? noBrowsers;
  let byFeature = isSupportedCache.get(key);
  if (!byFeature) {
    byFeature = new Map();
    isSupportedCache.set(key, byFeature);
  }

  const cached = byFeature.get(feature);
  if (cached !== undefined) {
    return cached;
  }

  const result = isSupported(feature, /** @type {string[]} */ (browsers));
  byFeature.set(feature, result);

  return result;
}

/**
 * Scan selector tokens for the compatibility features checked here. This is
 * deliberately not a selector parser: token values remain raw so escaped and
 * differently-cased pseudo names retain the old behavior.
 *
 * @param {string} selector
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
// The scanner intentionally handles several independent token classes in one pass.
// eslint-disable-next-line complexity
function scanCompatibility(selector, browsers) {
  let pseudoPrefix;
  let attributePrevious;
  let attributeDepth = 0;
  let attributeHasValue = false;
  let attributeValuePending = false;
  let attributeOperator;
  /** @type {TokenType[]} */
  const delimiters = [];

  try {
    const tokenStream = tokenizer({ css: selector });
    while (!tokenStream.endOfFile()) {
      const token = tokenStream.nextToken();
      const type = token[0];
      const value = token[1];

      if (type === TokenType.EOF) break;

      if (type === TokenType.OpenSquare) {
        delimiters.push(type);
        attributeDepth++;
        attributeHasValue = false;
        attributeValuePending = false;
        attributeOperator = undefined;
        attributePrevious = undefined;
      } else if (type === TokenType.Function || type === TokenType.OpenParen) {
        delimiters.push(TokenType.OpenParen);
      } else if (type === TokenType.CloseSquare) {
        if (delimiters.at(-1) !== TokenType.OpenSquare) return false;
        if (!attributeOperator && !isSupportedCached(cssSel2, browsers)) {
          return false;
        }
        delimiters.pop();
        attributeDepth--;
      } else if (type === TokenType.CloseParen) {
        if (delimiters.at(-1) !== TokenType.OpenParen) return false;
        delimiters.pop();
      }

      if (attributeDepth === 0) {
        if (
          type === TokenType.Delim &&
          (value.includes('~') || value.includes('>') || value.includes('+'))
        ) {
          if (value.includes('~')) {
            if (!isSupportedCached(cssSel3, browsers)) return false;
          } else if (!isSupportedCached(cssSel2, browsers)) {
            return false;
          }
        }

        if (type === TokenType.Colon) {
          pseudoPrefix = pseudoPrefix ? '::' : ':';
        } else if (pseudoPrefix) {
          let rawName = '';
          if (type === TokenType.Function) {
            rawName = value.slice(0, -1);
          } else if (type === TokenType.Ident) {
            rawName = value;
          }
          if (rawName) {
            const pseudo = `${pseudoPrefix}${rawName}`;
            const entry =
              pseudoElements[
                /** @type {keyof typeof pseudoElements} */ (pseudo)
              ];
            if (!entry && noVendor(pseudo)) return false;
            if (entry && !isSupportedCached(entry, browsers)) return false;
          }
          pseudoPrefix = undefined;
        } else {
          pseudoPrefix = undefined;
        }
      } else {
        if (type === TokenType.Delim && value === '=') {
          attributeHasValue = true;
          attributeValuePending = true;
          const operator = attributePrevious ? `${attributePrevious}=` : '=';
          attributeOperator = operator;
          const feature = level2Sel.has(operator) ? cssSel2 : cssSel3;
          if (!isSupportedCached(feature, browsers)) return false;
        } else if (
          type === TokenType.Delim &&
          attributeOperatorCharacters.has(value)
        ) {
          attributePrevious = value;
        }
        if (attributeHasValue) {
          if (
            attributeValuePending &&
            (type === TokenType.Ident || type === TokenType.String)
          ) {
            attributeValuePending = false;
          } else if (type === TokenType.Ident && value.toLowerCase() === 'i') {
            if (!isSupportedCached('css-case-insensitive', browsers))
              return false;
          }
        }
      }
    }
  } catch {
    return false;
  }
  return !pseudoPrefix && delimiters.length === 0;
}

/**
 * @param {string[]} selectors
 * @param{string[]=} browsers
 * @param{Map<string,boolean>=} compatibilityCache
 * @return {boolean}
 */
function ensureCompatibility(selectors, browsers, compatibilityCache) {
  // Should not merge mixins
  if (selectors.some(isCssMixin)) {
    return false;
  }

  // Should not merge :host selector https://github.com/angular/angular-cli/issues/18672
  if (selectors.some(isHostPseudoClass)) {
    return false;
  }
  return selectors.every((selector) => {
    if (simpleSelectorRe.test(selector)) {
      return true;
    }
    if (compatibilityCache && compatibilityCache.has(selector)) {
      return compatibilityCache.get(selector);
    }
    const compatible = scanCompatibility(selector, browsers);
    if (compatibilityCache) {
      compatibilityCache.set(selector, compatible);
    }
    return compatible;
  });
}

export { sameVendor, noVendor, pseudoElements, ensureCompatibility };
