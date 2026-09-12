import { pluginCase } from './bench-case-utils.mjs';

/* Focused merge-longhand cases: the no-op negative path (single standalone
 * shorthands, and multi-declaration rules that revert), and the concrete
 * leaf-to-side and leaf-to-component merges the refactor must not slow down. */
export const mergeCases = {
  'longhand-rule-merging': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.box-${index}{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px;padding-top:3px;padding-right:4px;padding-bottom:3px;padding-left:4px}`
    ).join('')
  ),
  'merge-longhand-noop-singles': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.noop-${index}{border:1px solid red;margin:1px 2px 3px 4px;padding:5px 6px}`
    ).join('')
  ),
  'merge-longhand-noop-border-multi': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.revert-${index}{border:1px solid red;border-top:2px dashed blue}`
    ).join('')
  ),
  'merge-longhand-cleanup-retention': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.retention-${index}{border-top-width:1px;border-top-width:calc(1px);border-top-width:env(top-width);border-top-width:1px\\9;border-top-style:solid;border-top-color:red;border-top-width:2px!important;border-top-width:calc(2px)!important;border-top-width:env(important-top-width)!important;border-top-width:2px\\9!important;border-top-style:dashed!important;border-top-color:blue!important;margin-top:1px;margin-top:calc(1px);margin-top:env(margin-top);margin-top:1px\\9;margin-top:2px!important;margin-top:calc(2px)!important;margin-top:env(important-margin-top)!important;margin-top:2px\\9!important}`
    ).join('')
  ),
  'merge-longhand-leaf-to-side': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.leaf-side-${index}{border-top-width:1px;border-top-style:solid;border-top-color:red}`
    ).join('')
  ),
  'merge-longhand-leaf-to-component': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.leaf-component-${index}{border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px}`
    ).join('')
  ),
  'merge-longhand-side-to-border': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.side-border-${index}{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}`
    ).join('')
  ),
  'merge-longhand-component-to-border': pluginCase(
    'postcss-merge-longhand',
    Array.from(
      { length: 500 },
      (_, index) =>
        `.component-border-${index}{border-width:1px;border-style:solid;border-color:red}`
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
