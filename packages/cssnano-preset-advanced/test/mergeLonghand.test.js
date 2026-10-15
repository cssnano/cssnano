import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSWithPresetFactory(preset);

test(
  'advanced preset drops a margin longhand overridden by a later shorthand',
  processCSS('a{z-index:1;margin-top:0;margin:0}', 'a{z-index:1;margin:0}')
);

test(
  'advanced preset drops a padding longhand overridden by a later shorthand',
  processCSS('a{z-index:1;padding-top:0;padding:0}', 'a{z-index:1;padding:0}')
);

test(
  'advanced preset drops a border side overridden by a later shorthand',
  processCSS('a{z-index:1;border-top:0;border:0}', 'a{z-index:1;border:0}')
);

// A `border-top` shorthand would reset the top colour that `border-color` set.
test(
  'advanced preset keeps border-top longhands that lack a side colour',
  passthroughCSS(
    'a{border-color:purple;border-top-width:2px;border-top-style:solid}'
  )
);

test(
  'advanced preset drops border-color overridden by a later border shorthand',
  processCSS(
    'a{border-color:purple;border:0;border-top:3px solid}',
    'a{border:0;border-top:3px solid}'
  )
);
