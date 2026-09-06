import { pluginCase } from './bench-case-utils.mjs';

export const normalizeCases = {
  'normalize-display-values-cache-misses': pluginCase(
    'postcss-normalize-display-values',
    Array.from(
      { length: 1000 },
      (_, index) => `.display-${index}{display:inline/**/${index}*/flow-root}`
    ).join('')
  ),
  'normalize-display-values-cache-hits': pluginCase(
    'postcss-normalize-display-values',
    Array.from(
      { length: 1000 },
      (_, index) => `.display-${index}{display:inline flow-root}`
    ).join('')
  ),
  'normalize-unicode-cache-misses': pluginCase(
    'postcss-normalize-unicode',
    Array.from(
      { length: 1000 },
      (_, index) =>
        `@font-face{font-family:font-${index};unicode-range:u+2b00-2bff/**/${index}*/}`
    ).join('')
  ),
  'normalize-unicode-cache-hits': pluginCase(
    'postcss-normalize-unicode',
    Array.from(
      { length: 1000 },
      (_, index) =>
        `@font-face{font-family:font-${index};unicode-range:u+2b00-2bff}`
    ).join('')
  ),
};
