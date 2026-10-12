import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { passthroughCSS } = processCSSWithPresetFactory(preset);

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
