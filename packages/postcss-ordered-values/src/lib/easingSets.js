import easingFunctions from '../rules/easingFunctions.json' with { type: 'json' };

/** Keyword <easing-function>s from @webref/css. */
export const easingKeywords = new Set(easingFunctions.keywords);

/** Function-shaped <easing-function>s from @webref/css. */
export const easingFunctionNames = new Set(easingFunctions.functions);
