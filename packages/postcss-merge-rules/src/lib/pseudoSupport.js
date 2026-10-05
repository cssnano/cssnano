import { cssSel2, cssSel3 } from './supportCache.js';

const cssGencontent = 'css-gencontent';
const cssFirstLetter = 'css-first-letter';
const cssFirstLine = 'css-first-line';
const cssInOutOfRange = 'css-in-out-of-range';
const formValidation = 'form-validation';

// Each value is a caniuse feature key verified to describe exactly that
// pseudo; pseudos without a verified key stay gated below.
export const pseudoElements = {
  ':active': cssSel2,
  ':after': cssGencontent,
  ':any-link': 'css-any-link',
  ':autofill': 'css-autofill',
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
  ':fullscreen': 'fullscreen',
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
  ':modal': 'dialog',
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
  ':read-only': 'css-read-only-write',
  ':read-write': 'css-read-only-write',
  ':required': formValidation,
  ':root': cssSel3,
  ':target': cssSel3,
  ':where': 'css-matches-pseudo',
  '::after': cssGencontent,
  '::backdrop': 'dialog',
  '::before': cssGencontent,
  '::file-selector-button': 'css-file-selector-button',
  '::first-letter': cssFirstLetter,
  '::first-line': cssFirstLine,
  '::marker': 'css-marker-pseudo',
  '::placeholder': 'css-placeholder',
  '::selection': 'css-selection',
  ':valid': formValidation,
  ':visited': cssSel2,
};

const vendorPrefixes = new Set([
  '-ah-',
  '-apple-',
  '-atsc-',
  '-epub-',
  '-hp-',
  '-khtml-',
  '-moz-',
  '-ms-',
  '-o-',
  '-rim',
  '-ro-',
  '-tc-',
  '-wap-',
  '-webkit-',
  '-xv-',
]);

/**
 * The vendor prefix of a pseudo-class or pseudo-element name, such as
 * `-moz-` for `-moz-selection`; a prefix is meaningful only at the start of
 * an identifier, so `x-moz-y` has none.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {string} the prefix, or the empty string when there is none
 */
export function vendorPrefixOf(name) {
  if (name[0] !== '-') return '';
  const prefix = name.slice(0, name.indexOf('-', 1) + 1);
  return vendorPrefixes.has(prefix) ? prefix : '';
}

/**
 * Internet Explorer uses :-ms-input-placeholder.
 * Microsoft Edge uses ::-ms-input-placeholder.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {boolean}
 */
export function isMsInputPlaceholder(name) {
  return name === '-ms-input-placeholder';
}
