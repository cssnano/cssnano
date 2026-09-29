import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import fontMagician from 'postcss-font-magician';
import cssnano from '../src/index.js';

test('should work with postcss-font-magician', async () => {
  const css = `
    body {
      font-family: "Alice";
    }
    `;
  const result = await postcss([fontMagician({}), cssnano()]).process(css, {
    from: undefined,
  });
  assert.strictEqual(
    result.css,
    `@font-face{font-family:Alice;font-style:normal;font-weight:400;src:url(//fonts.gstatic.com/s/alice/v20/OpNCnoEEmtHa6GcArgo.eot?#) format("eot"),url(//fonts.gstatic.com/s/alice/v20/OpNCnoEEmtHa6GcOrg4.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v20/OpNCnoEEmtHa6GcArgg.woff) format("woff")}body{font-family:Alice}`
  );
});
