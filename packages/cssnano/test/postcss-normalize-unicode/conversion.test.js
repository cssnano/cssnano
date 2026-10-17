import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-normalize-unicode/index.js';

const { processCSS } = processCSSFactory(plugin);

function fixture(range) {
  return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

test(
  'should convert a unicode range to a wildcard range',
  processCSS(
    fixture('u+2b00-2bff'), // Miscellaneous Symbols and Arrows
    fixture('u+2b??'),
    withTargets(['defaults', 'not ie <=11'])
  )
);

describe('Convert', () => {
  test(
    'should convert a unicode range to a wildcard range (2)',
    processCSS(
      fixture('u+1e00-1eff'), // Latin Extended Additional
      fixture('u+1e??'),
      withTargets(['defaults', 'not ie <=11'])
    )
  );

  test(
    'should convert a unicode range to a wildcard range (3)',
    processCSS(
      fixture('u+2120-212f'),
      fixture('u+212?'),
      withTargets(['defaults', 'not ie <=11'])
    )
  );

  test(
    'should convert a unicode range to a wildcard range (4)',
    processCSS(
      fixture('u+2100-21ff'),
      fixture('u+21??'),
      withTargets(['defaults', 'not ie <=11'])
    )
  );

  test(
    'should convert a unicode range to a wildcard range (5)',
    processCSS(
      fixture('u+2000-2fff'),
      fixture('u+2???'),
      withTargets(['defaults', 'not ie <=11'])
    )
  );

  test(
    'should convert a unicode range starting at zero to a bare wildcard',
    processCSS(
      fixture('u+0-f'),
      fixture('u+?'),
      withTargets(['defaults', 'not ie <=11'])
    )
  );
});
