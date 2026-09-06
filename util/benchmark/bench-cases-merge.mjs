import { pluginCase } from './bench-case-utils.mjs';

export const mergeCases = {
  'longhand-rule-merging': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.box-${index}{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px;padding-top:3px;padding-right:4px;padding-bottom:3px;padding-left:4px}`
    ).join('')
  ),
  'merge-longhand-columns': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.columns-${index}{columns:12em auto;column-width:${index + 1}px;column-count:2}`
    ).join('')
  ),
  'merge-longhand-columns-height-guard': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.column-height-${index}{columns:30em/**//10em;column-width:${index + 1}px;column-count:2}`
    ).join('')
  ),
  'merge-rules-dense': pluginCase(
    'postcss-merge-rules',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.dense-${index}{color:red;background:#fff;border:0;font-weight:700}`
    ).join('')
  ),
  'merge-rules-sparse': pluginCase(
    'postcss-merge-rules',
    Array.from(
      { length: 200 },
      (_, index) => `.sparse-${index}{--value:${index}}`
    ).join('')
  ),
  'merge-rules-dependency-rich': pluginCase(
    'postcss-merge-rules',
    Array.from({ length: 80 }, (_, index) =>
      [
        `.card-${index}{color:red;display:grid;gap:1rem}`,
        `.card-${index}{color:red;font-weight:${index % 2 ? '700' : '400'}}`,
        `.feature-${index}{color:red;display:grid;gap:1rem}`,
        `@media (width >= ${index + 320}px){.card-${index}{display:grid;gap:1rem}}`,
        `@supports (selector(:has(*))){.card-${index}:has(img){color:red;display:grid}}`,
      ].join('')
    ).join('')
  ),
  'merge-rules-reseed-cascade': pluginCase(
    'postcss-merge-rules',
    Array.from({ length: 24 }, (_, index) => {
      const query = index < 12 ? '(max-width: 767px)' : '(min-width: 768px)';
      const previousBoundary =
        index === 0 ? '' : `.shared-${index - 1}{color:red;display:block}`;
      const noise = Array.from(
        { length: 80 },
        (unused, noiseIndex) =>
          `.component-${index}-${noiseIndex}{--value:${index}-${noiseIndex}}`
      ).join('');
      return `@media ${query}{${previousBoundary}${noise}.shared-${index}{color:red;display:block}}`;
    }).join('')
  ),
};
