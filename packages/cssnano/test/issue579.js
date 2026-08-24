import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import cssnano from '../src/index.js';

test('should support `env()` and `constant()` is an iPhone X-only feature', async () => {
  const css = `
    @supports (height: env(safe-area-inset-bottom)) {
      .footer {
        padding-bottom: calc(env(safe-area-inset-bottom) * 3) !important;
      }
    }
    `;

  const result = await postcss([cssnano]).process(css, { from: undefined });
  assert.strictEqual(
    result.css,
    '@supports (height:env(safe-area-inset-bottom)){.footer{padding-bottom:calc(env(safe-area-inset-bottom)*3)!important}}'
  );
});
