'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
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
      assert.snapshot(
        result.css,
        `@font-face{font-family:Alice;font-style:normal;font-weight:400;src:local("Alice Regular"),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v12/OpNCnoEEmtHa6GcOrgo.eot?#) format("eot"),url(//fonts.gstatic.com/s/alice/v12/OpNCnoEEmtHa6GcOrg4.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v12/OpNCnoEEmtHa6GcOrgg.woff) format("woff")}body{font-family:Alice}`
      );
    });
});
test.run();
