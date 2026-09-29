import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

export const stylehacksCases = {
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
};
