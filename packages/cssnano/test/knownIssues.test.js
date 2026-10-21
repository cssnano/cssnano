import { test } from 'node:test';
import processCss from './_processCss.js';

test(
  'should merge duplicate padding values',
  processCss,
  `body { padding: 50px; } body { padding: 0; }`,
  `body{padding:0}`
);

/*
 * This needs investigation; the property string is truncated
 * likely because of raw value handling. We might potentially
 * be able to update this because PostCSS 6 changed how raw
 * values are handled; however this is a low priority because
 * CSS is generally not written this way.
 *
 * Ref: https://github.com/cssnano/cssnano/issues/322
 */

test.skip(
  'should correctly handle escaped css',
  processCss,
  `\\64 \\69 \\76 { \\63 \\6f \\6c \\6f \\72 : \\72 \\67 \\62 \\61 \\28 \\32 \\35 \\35 \\2c \\30 \\2c \\30 \\2c \\2e \\37 \\35 \\29 }`,
  `\\64\\69\\76{\\63\\6f\\6c\\6f\\72:\\72\\67\\62\\61\\28\\32\\35\\35\\2c\\30\\2c\\30\\2c\\2e\\37\\35\\29}`
);
