import cssAnyLink from 'caniuse-lite/data/features/css-any-link.js';
import cssAutofill from 'caniuse-lite/data/features/css-autofill.js';
import cssCaseInsensitive from 'caniuse-lite/data/features/css-case-insensitive.js';
import cssDefaultPseudo from 'caniuse-lite/data/features/css-default-pseudo.js';
import cssDirPseudo from 'caniuse-lite/data/features/css-dir-pseudo.js';
import cssFileSelectorButton from 'caniuse-lite/data/features/css-file-selector-button.js';
import cssFirstLetter from 'caniuse-lite/data/features/css-first-letter.js';
import cssFirstLine from 'caniuse-lite/data/features/css-first-line.js';
import cssFocusVisible from 'caniuse-lite/data/features/css-focus-visible.js';
import cssFocusWithin from 'caniuse-lite/data/features/css-focus-within.js';
import cssGencontent from 'caniuse-lite/data/features/css-gencontent.js';
import cssHas from 'caniuse-lite/data/features/css-has.js';
import cssInOutOfRange from 'caniuse-lite/data/features/css-in-out-of-range.js';
import cssIndeterminatePseudo from 'caniuse-lite/data/features/css-indeterminate-pseudo.js';
import cssInitialValue from 'caniuse-lite/data/features/css-initial-value.js';
import cssMarkerPseudo from 'caniuse-lite/data/features/css-marker-pseudo.js';
import cssMatchesPseudo from 'caniuse-lite/data/features/css-matches-pseudo.js';
import cssOptionalPseudo from 'caniuse-lite/data/features/css-optional-pseudo.js';
import cssPlaceholder from 'caniuse-lite/data/features/css-placeholder.js';
import cssPlaceholderShown from 'caniuse-lite/data/features/css-placeholder-shown.js';
import cssReadOnlyWrite from 'caniuse-lite/data/features/css-read-only-write.js';
import cssRrggbbaa from 'caniuse-lite/data/features/css-rrggbbaa.js';
import cssSel2 from 'caniuse-lite/data/features/css-sel2.js';
import cssSel3 from 'caniuse-lite/data/features/css-sel3.js';
import cssSelection from 'caniuse-lite/data/features/css-selection.js';
import dialog from 'caniuse-lite/data/features/dialog.js';
import formValidation from 'caniuse-lite/data/features/form-validation.js';
import fullscreen from 'caniuse-lite/data/features/fullscreen.js';

/**
 * The caniuse features that the plugins check for support, sorted. Each one
 * is imported on its own, so a bundle carries only these few instead of the
 * whole caniuse database.
 */
export const packedFeatures = Object.freeze({
  'css-any-link': cssAnyLink,
  'css-autofill': cssAutofill,
  'css-case-insensitive': cssCaseInsensitive,
  'css-default-pseudo': cssDefaultPseudo,
  'css-dir-pseudo': cssDirPseudo,
  'css-file-selector-button': cssFileSelectorButton,
  'css-first-letter': cssFirstLetter,
  'css-first-line': cssFirstLine,
  'css-focus-visible': cssFocusVisible,
  'css-focus-within': cssFocusWithin,
  'css-gencontent': cssGencontent,
  'css-has': cssHas,
  'css-in-out-of-range': cssInOutOfRange,
  'css-indeterminate-pseudo': cssIndeterminatePseudo,
  'css-initial-value': cssInitialValue,
  'css-marker-pseudo': cssMarkerPseudo,
  'css-matches-pseudo': cssMatchesPseudo,
  'css-optional-pseudo': cssOptionalPseudo,
  'css-placeholder': cssPlaceholder,
  'css-placeholder-shown': cssPlaceholderShown,
  'css-read-only-write': cssReadOnlyWrite,
  'css-rrggbbaa': cssRrggbbaa,
  'css-sel2': cssSel2,
  'css-sel3': cssSel3,
  'css-selection': cssSelection,
  dialog,
  'form-validation': formValidation,
  fullscreen,
});

/** @typedef {keyof typeof packedFeatures} FeatureKey */

export const featureKeys = Object.freeze(
  /** @type {FeatureKey[]} */ (Object.keys(packedFeatures))
);
