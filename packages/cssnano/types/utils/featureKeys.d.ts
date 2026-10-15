/**
 * The caniuse features that the plugins check for support, sorted. Each one
 * is imported on its own, so a bundle carries only these few instead of the
 * whole caniuse database.
 */
export declare const packedFeatures: Readonly<{
    'css-any-link': Record<string, unknown>;
    'css-autofill': Record<string, unknown>;
    'css-case-insensitive': Record<string, unknown>;
    'css-default-pseudo': Record<string, unknown>;
    'css-dir-pseudo': Record<string, unknown>;
    'css-file-selector-button': Record<string, unknown>;
    'css-first-letter': Record<string, unknown>;
    'css-first-line': Record<string, unknown>;
    'css-focus-visible': Record<string, unknown>;
    'css-focus-within': Record<string, unknown>;
    'css-gencontent': Record<string, unknown>;
    'css-has': Record<string, unknown>;
    'css-in-out-of-range': Record<string, unknown>;
    'css-indeterminate-pseudo': Record<string, unknown>;
    'css-initial-value': Record<string, unknown>;
    'css-marker-pseudo': Record<string, unknown>;
    'css-matches-pseudo': Record<string, unknown>;
    'css-optional-pseudo': Record<string, unknown>;
    'css-placeholder': Record<string, unknown>;
    'css-placeholder-shown': Record<string, unknown>;
    'css-read-only-write': Record<string, unknown>;
    'css-rrggbbaa': Record<string, unknown>;
    'css-sel2': Record<string, unknown>;
    'css-sel3': Record<string, unknown>;
    'css-selection': Record<string, unknown>;
    dialog: Record<string, unknown>;
    'form-validation': Record<string, unknown>;
    fullscreen: Record<string, unknown>;
}>;
export type FeatureKey = keyof typeof packedFeatures;
/** @typedef {keyof typeof packedFeatures} FeatureKey */
export declare const featureKeys: readonly ("css-any-link" | "css-autofill" | "css-case-insensitive" | "css-default-pseudo" | "css-dir-pseudo" | "css-file-selector-button" | "css-first-letter" | "css-first-line" | "css-focus-visible" | "css-focus-within" | "css-gencontent" | "css-has" | "css-in-out-of-range" | "css-indeterminate-pseudo" | "css-initial-value" | "css-marker-pseudo" | "css-matches-pseudo" | "css-optional-pseudo" | "css-placeholder" | "css-placeholder-shown" | "css-read-only-write" | "css-rrggbbaa" | "css-sel2" | "css-sel3" | "css-selection" | "dialog" | "form-validation" | "fullscreen")[];
//# sourceMappingURL=featureKeys.d.ts.map