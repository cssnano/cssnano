import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

export const stylehacksCases = {
  'stylehacks-detect': {
    plugin: 'stylehacks',
    createProcessor() {
      const {
        detectDeclaration,
      } = require('../../packages/cssnano/src/utils/stylehacks/index.js');
      return postcss([
        {
          postcssPlugin: 'stylehacks-detect-benchmark',
          Declaration(declaration) {
            void detectDeclaration(declaration);
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
};
