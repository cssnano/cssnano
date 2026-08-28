// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

function pluginProcessor(packageName) {
  return postcss([require(`../../packages/${packageName}/src/index.js`)]);
}

export const benchmarkCases = {
  'selector-reduction': {
    plugin: 'postcss-minify-selectors',
    createProcessor() {
      return pluginProcessor('postcss-minify-selectors');
    },
    css: Array.from(
      { length: 200 },
      (_, index) =>
        `.scope-${index} :is(.item-${index}, .item-${index}):not(.disabled) > .child-${index}{color:red}`
    ).join(''),
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
};
