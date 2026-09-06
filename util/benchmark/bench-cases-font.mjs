import { pluginCase } from './bench-case-utils.mjs';

export const fontCases = {
  'minify-font-values-shorthands': pluginCase(
    'postcss-minify-font-values',
    Array.from(
      { length: 1000 },
      (_, index) =>
        `.font-${index}{font:bold italic 16px/1.5 "Font Family ${index}",Arial,sans-serif}`
    ).join('')
  ),
};
