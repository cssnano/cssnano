import { codeBlockRegionTransformer } from './codeBlockRegion.js';

/**
 * Shared Shiki settings for Markdown fences and `<Code>` samples, so every
 * code block gets the same theme and accessible region naming.
 */
export const shikiOptions = {
  themes: {
    light: 'github-light-high-contrast',
    dark: 'github-dark-high-contrast',
  },
  // Each colour is light-dark(light, dark), so code blocks follow the colour scheme without theme variables.
  defaultColor: 'light-dark()',
  transformers: [codeBlockRegionTransformer],
};
