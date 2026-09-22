import { pluginCase } from './bench-case-utils.mjs';

// Gradient stop fixup touches every position token, so these cases separate the
// declarations that rewrite from those that only prove the value is minimal.
export const gradientCases = {
  'minify-gradients-stop-fixup': pluginCase(
    'postcss-minify-gradients',
    Array.from(
      { length: 1000 },
      (_, index) =>
        `.grad-${index}{background:linear-gradient(red 0%,orange 25% ${index},blue 100%)}`
    ).join('')
  ),
  // Functional colours make each stop lookup resolve its balancing parenthesis.
  'minify-gradients-functional-colours': pluginCase(
    'postcss-minify-gradients',
    Array.from(
      { length: 1000 },
      (_, index) =>
        `.grad-${index}{background:linear-gradient(rgb(0 0 0 / 50%) 10px,rgb(255 255 255 / ${index % 10}%) 20px)}`
    ).join('')
  ),
  'minify-gradients-untouched': pluginCase(
    'postcss-minify-gradients',
    Array.from(
      { length: 1000 },
      (_, index) =>
        `.grad-${index}{background:linear-gradient(red ${index + 1}px,blue ${index + 2}px)}`
    ).join('')
  ),
};
