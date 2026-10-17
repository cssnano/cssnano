import { test } from 'node:test';
import preset from '../../../src/presets/advanced.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { passthroughCSS } = processCSSFactory(preset());

// Guards against URL rewriting moving from postcss-normalize-url into the
// advanced preset. The default preset's tests cover the rest of the URL token.
test(
  'should keep dot segments in URLs, guarding against URL rewriting moving into the advanced preset',
  passthroughCSS('a{background:url(../a/./b.png)}')
);

test(
  'should keep duplicate slashes in absolute URLs, guarding against URL rewriting moving into the advanced preset',
  passthroughCSS('a{background:url(http://example.com/a//b.png)}')
);
