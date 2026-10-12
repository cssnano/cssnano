import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSWithPresetFactory(preset);

test(
  'should unquote url() tokens',
  processCSS('a{background:url("a.png")}', 'a{background:url(a.png)}')
);

test(
  'should keep dot segments in URLs, since removing them assumes the server does not use symlinks or rewrites',
  passthroughCSS('a{background:url(../a/./b.png)}')
);

test(
  'should keep duplicate slashes in URLs, since /a//b and /a/b identify different resources',
  passthroughCSS('a{background:url(http://example.com/a//b.png)}')
);

test(
  'should leave SVG data URIs to the asset pipeline',
  passthroughCSS(
    `a{background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><rect width='1' height='1'/></svg>")}`
  )
);
