// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

function pluginProcessor(packageName) {
  return postcss([require(`../../packages/${packageName}/src/index.js`)]);
}

export const benchmarkCases = {
  'normalize-display-values-cache-misses': {
    plugin: 'postcss-normalize-display-values',
    createProcessor() {
      return pluginProcessor('postcss-normalize-display-values');
    },
    css: Array.from(
      { length: 1000 },
      (_, index) => `.display-${index}{display:inline/**/${index}*/flow-root}`
    ).join(''),
  },
  'normalize-display-values-cache-hits': {
    plugin: 'postcss-normalize-display-values',
    createProcessor() {
      return pluginProcessor('postcss-normalize-display-values');
    },
    css: Array.from(
      { length: 1000 },
      (_, index) => `.display-${index}{display:inline flow-root}`
    ).join(''),
  },
  'normalize-unicode-cache-misses': {
    plugin: 'postcss-normalize-unicode',
    createProcessor() {
      return pluginProcessor('postcss-normalize-unicode');
    },
    css: Array.from(
      { length: 1000 },
      (_, index) =>
        `@font-face{font-family:font-${index};unicode-range:u+2b00-2bff/**/${index}*/}`
    ).join(''),
  },
  'normalize-unicode-cache-hits': {
    plugin: 'postcss-normalize-unicode',
    createProcessor() {
      return pluginProcessor('postcss-normalize-unicode');
    },
    css: Array.from(
      { length: 1000 },
      (_, index) =>
        `@font-face{font-family:font-${index};unicode-range:u+2b00-2bff}`
    ).join(''),
  },
  'selector-reduction': {
    plugin: 'postcss-minify-selectors',
    createProcessor() {
      return pluginProcessor('postcss-minify-selectors');
    },
    css: Array.from(
      { length: 2000 },
      (_, index) =>
        `.scope-${index} :is(.item-${index}, .item-${index}):not(.disabled) > .child-${index}{color:red}`
    ).join(''),
  },
  'nested-selector-deduplication': {
    plugin: 'postcss-minify-selectors',
    createProcessor() {
      return pluginProcessor('postcss-minify-selectors');
    },
    css: Array.from({ length: 40 }, (_, index) => {
      const selectors = Array.from(
        { length: 200 },
        (unused, selectorIndex) => `.item-${selectorIndex % 40}`
      ).join(',');

      return `.scope-${index}:is(:not(${selectors}),:not(${selectors})){color:red}`;
    }).join(''),
  },
  'function-selector-deduplication': {
    plugin: 'postcss-minify-selectors',
    createProcessor() {
      return pluginProcessor('postcss-minify-selectors');
    },
    css: Array.from({ length: 40 }, (_, index) => {
      const selectors = Array.from(
        { length: 200 },
        (unused, selectorIndex) => `:not(.item-${selectorIndex % 40})`
      ).join(',');

      return `.scope-${index}:is(${selectors}){color:red}`;
    }).join(''),
  },
  'selector-ir-long-nested': {
    plugin: 'postcss-minify-selectors',
    createProcessor() {
      return pluginProcessor('postcss-minify-selectors');
    },
    css: Array.from({ length: 120 }, (_, index) => {
      const common = `.scope-${index}:is(.a${index % 8},:not(.b${index % 8},.c${index % 8}))[data-label="x,${index}"]`;
      const edges = Array.from(
        { length: 24 },
        (unused, edgeIndex) => `${common} .item-${edgeIndex}`
      );
      return `${edges.join(',')}{color:red}`;
    }).join(''),
  },
  'ordered-values-tokenization': {
    plugin: 'postcss-ordered-values',
    createProcessor() {
      return pluginProcessor('postcss-ordered-values');
    },
    css: Array.from({ length: 250 }, (_, index) => {
      const nested = `calc((var(--delay-${index}, 1s) + min(2s, 3s)))`;
      return [
        `.flat-${index}{transition:opacity 1s linear ${index}ms}`,
        `.nested-${index}{transition:transform ${nested} ease-in}`,
        `.comment-${index}{animation:fade/**/ 1s linear ${index}ms}`,
        `.variable-${index}{border:var(--border-${index}) solid red}`,
        `.grouped-${index}{box-shadow:rgb(0 0 0 / .2) 1px 2px}`,
      ].join('');
    }).join(''),
  },
  'longhand-rule-merging': {
    plugin: 'postcss-merge-longhand',
    createProcessor() {
      return pluginProcessor('postcss-merge-longhand');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.box-${index}{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px;padding-top:3px;padding-right:4px;padding-bottom:3px;padding-left:4px}`
    ).join(''),
  },
  'merge-longhand-columns': {
    plugin: 'postcss-merge-longhand',
    createProcessor() {
      return pluginProcessor('postcss-merge-longhand');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.columns-${index}{columns:12em auto;column-width:${index + 1}px;column-count:2}`
    ).join(''),
  },
  'minify-font-values-shorthands': {
    plugin: 'postcss-minify-font-values',
    createProcessor() {
      return pluginProcessor('postcss-minify-font-values');
    },
    css: Array.from(
      { length: 1000 },
      (_, index) =>
        `.font-${index}{font:bold italic 16px/1.5 "Font Family ${index}",Arial,sans-serif}`
    ).join(''),
  },
  'merge-longhand-columns-height-guard': {
    plugin: 'postcss-merge-longhand',
    createProcessor() {
      return pluginProcessor('postcss-merge-longhand');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.column-height-${index}{columns:30em/**//10em;column-width:${index + 1}px;column-count:2}`
    ).join(''),
  },
  'stylehacks-detect': {
    plugin: 'stylehacks',
    createProcessor() {
      const { detect } = require('../../packages/stylehacks/src/index.js');

      return postcss([
        {
          postcssPlugin: 'stylehacks-detect-benchmark',
          Declaration(declaration) {
            void detect(declaration);
          },
        },
      ]);
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.stylehacks-${index} { margin-top: 1px; margin-right: 2px; margin-bottom: 1px; margin-left: 2px; padding-top: 3px; padding-right: 4px; padding-bottom: 3px; padding-left: 4px; }`
    ).join(''),
  },
  'stylehacks-selector-detect': {
    plugin: 'stylehacks',
    createProcessor() {
      const { detect } = require('../../packages/stylehacks/src/index.js');

      return postcss([
        {
          postcssPlugin: 'stylehacks-selector-detect-benchmark',
          Rule(rule) {
            void detect(rule);
          },
        },
      ]);
    },
    css: Array.from(
      { length: 500 },
      (_, index) =>
        `* html .star-${index}, html:first-child .first-${index}, html > /**/ body .comment-${index}, body:empty .empty-${index}, :is(.nested-${index}, [data-value="a,b"]){color:red}`
    ).join(''),
  },
  'ordered-value-normalization': {
    plugin: 'postcss-ordered-values',
    createProcessor() {
      return pluginProcessor('postcss-ordered-values');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.grid-${index}{animation:2s ease-in ${index % 2 ? 'reverse' : 'normal'} 1s slide-${index};transition:opacity 1s ease-in 0s;background:top left/cover no-repeat url(image-${index}.png)}`
    ).join(''),
  },
  'merge-rules-dense': {
    plugin: 'postcss-merge-rules',
    createProcessor() {
      return pluginProcessor('postcss-merge-rules');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.dense-${index}{color:red;background:#fff;border:0;font-weight:700}`
    ).join(''),
  },
  'merge-rules-sparse': {
    plugin: 'postcss-merge-rules',
    createProcessor() {
      return pluginProcessor('postcss-merge-rules');
    },
    css: Array.from(
      { length: 200 },
      (_, index) => `.sparse-${index}{--value:${index}}`
    ).join(''),
  },
  'merge-rules-dependency-rich': {
    plugin: 'postcss-merge-rules',
    createProcessor() {
      return pluginProcessor('postcss-merge-rules');
    },
    css: Array.from({ length: 80 }, (_, index) =>
      [
        `.card-${index}{color:red;display:grid;gap:1rem}`,
        `.card-${index}{color:red;font-weight:${index % 2 ? '700' : '400'}}`,
        `.feature-${index}{color:red;display:grid;gap:1rem}`,
        `@media (width >= ${index + 320}px){.card-${index}{display:grid;gap:1rem}}`,
        `@supports (selector(:has(*))){.card-${index}:has(img){color:red;display:grid}}`,
      ].join('')
    ).join(''),
  },
  'merge-rules-reseed-cascade': {
    plugin: 'postcss-merge-rules',
    createProcessor() {
      return pluginProcessor('postcss-merge-rules');
    },
    // Repeated equivalent media blocks reproduce the depth-first adjacency
    // churn that makes cross-parent mergeParents() moves require reseeding.
    css: Array.from({ length: 24 }, (_, index) => {
      const query = index < 12 ? '(max-width: 767px)' : '(min-width: 768px)';
      const previousBoundary =
        index === 0 ? '' : `.shared-${index - 1}{color:red;display:block}`;
      const noise = Array.from(
        { length: 80 },
        (unused, noiseIndex) =>
          `.component-${index}-${noiseIndex}{--value:${index}-${noiseIndex}}`
      ).join('');
      return `@media ${query}{${previousBoundary}${noise}.shared-${index}{color:red;display:block}}`;
    }).join(''),
  },
  'ordered-value-cache-sharing': {
    plugin: 'postcss-ordered-values',
    createProcessor() {
      return pluginProcessor('postcss-ordered-values');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.cache-${index}{border:solid 1px red;border-top:red solid 1px;border-right:1px red solid;border-bottom:solid red 1px;border-left:red 1px solid;grid-column:2 / 1;grid-row:1 / 2;grid-column-start:2;grid-row-start:1;flex-flow:wrap column;list-style:disc inside}`
    ).join(''),
  },
  'ordered-value-tokenization': {
    plugin: 'postcss-ordered-values',
    createProcessor() {
      return pluginProcessor('postcss-ordered-values');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.tokens-${index}{border:1px solid red;outline:solid ${index}px blue;flex-flow:column wrap;transition:opacity 1s ease-in;animation:2s ease-in slide-${index};box-shadow:rgba(0,0,0,.2) 0 min(10px,2vw);border-color:var(--color,red) solid 1px;list-style:inside url("a,b") square}`
    ).join(''),
  },
};
