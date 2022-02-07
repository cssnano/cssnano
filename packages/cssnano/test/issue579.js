'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const cssnano = require('..');

test('should support `env()` and `constant()` is an iPhone X-only feature', () => {
  const css = `
    @supports (height: env(safe-area-inset-bottom)) {
      .footer {
        padding-bottom: calc(env(safe-area-inset-bottom) * 3) !important;
      }
    }
    `;

  return postcss([cssnano])
    .process(css, { from: undefined })
    .then((result) => {
      assert.is(
        result.css,
        '@supports (height:env(safe-area-inset-bottom)){.footer{padding-bottom:calc(env(safe-area-inset-bottom)*3)!important}}'
      );
    });
});
test.run();
