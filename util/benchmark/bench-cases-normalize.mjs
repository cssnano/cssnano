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
  'normalize-whitespace-nested-fallbacks': pluginCase(
    'postcss-normalize-whitespace',
    (() => {
      let inner = Array.from({ length: 20 }, (_, i) => ` ${i}px `).join(',');
      for (let d = 0; d < 50; d++) {
        inner = `fn( ${inner} , ${d}px )`;
      }
      return Array.from(
        { length: 20 },
        (_, index) => `.rule-${index}{width:var(  --x  , ${inner}  )}`
      ).join('');
    })()
  ),
};
