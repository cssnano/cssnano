import { test } from 'node:test';
import { processCSSFactory } from '../../../../../util/testHelpers.js';
import { onlyTransform } from '../onlyTransform.js';
const plugin = onlyTransform(['mergeLonghand']);

const { processCSS } = processCSSFactory(plugin);

const lab = 'lab(50% 40 59.5)';
const sixteenBefore = Array.from(
  { length: 16 },
  (_, index) => `border-top-color:#${String(index).padStart(6, '0')}`
);

test(
  'keeps the seventeenth border-top-color, the value a target without lab() still uses, after its cell outgrows the history',
  // The sixteen earlier colours are overridden by the seventeenth, so they are
  // dropped. The lab() longhands are not merged for ie 11, so no candidate
  // drops the seventeenth.
  processCSS(
    `a{${[...sixteenBefore, 'border-top-color:#000016'].join(';')};border-top-color:${lab};border-right-color:${lab};border-bottom-color:${lab};border-left-color:${lab}}`,
    `a{border-top-color:#000016;border-top-color:${lab};border-right-color:${lab};border-bottom-color:${lab};border-left-color:${lab}}`
  )
);
