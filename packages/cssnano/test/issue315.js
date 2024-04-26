'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const fontMagician = require('postcss-font-magician');
const cssnano = require('..');

test('should work with postcss-font-magician', () => {
  const css = `
    body {
      font-family: "Alice";
    }
    `;
  return postcss([fontMagician({}), cssnano()])
    .process(css, { from: undefined })
    .then((result) => {
      assert.strictEqual(
        result.css,
        `@font-face{font-family:Alice;font-style:normal;font-weight:400;src:url(//fonts.gstatic.com/s/alice/v20/OpNCnoEEmtHa6GcArgo.eot?#) format("eot"),url(//fonts.gstatic.com/s/alice/v20/OpNCnoEEmtHa6GcOrg4.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v20/OpNCnoEEmtHa6GcArgg.woff) format("woff")}body{font-family:Alice}`
      );
    });
});
