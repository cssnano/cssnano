import { processCSSWithPresetFactory } from '../../../../util/testHelpers';
import preset from '..';

const { processCSS, passthroughCSS } = processCSSWithPresetFactory(preset);

test(
  'keep order of short- and longhand properties, left to right',
  passthroughCSS('a{animation-name:a;animation:b}')
);

test(
  'keep order of short- and longhand properties, right to left',
  passthroughCSS('a{animation:b;animation-name:a}')
);

test(
  'keep order of unknown properties, left to right',
  passthroughCSS('a{z-unknown:0;a-unknown:0}')
);

test(
  'keep order of unknown properties, right to left',
  passthroughCSS('a{a-unknown:0;z-unknown:0}')
);

test(
  'keep order of vendor prefixed properties',
  passthroughCSS('a{animation-name:a;-webkit-animation:b}')
);

test(
  'keep order of vendor prefixed properties, mixed with short- and longhand',
  passthroughCSS(
    'a{animation-name:a;animation:b;-webkit-animation:c;-webkit-animation-name:d}'
  )
);

test(
  'sort values between short- and longhand properties',
  processCSS(
    'a{animation-name:a;z-index:0;animation:b;color:0}',
    'a{animation-name:a;animation:b;color:0;z-index:0}'
  )
);

test(
  'sort values between unknown properties',
  processCSS(
    'a{z-unknown:0;z-index:0;a-unknown:0;color:0}',
    'a{z-unknown:0;a-unknown:0;color:0;z-index:0}'
  )
);

test(
  'sort mixed short- and longhand properties',
  processCSS(
    'a{animation-name:a;flex-wrap:0;animation:b;flex-flow:1}',
    'a{animation-name:a;animation:b;flex-wrap:0;flex-flow:1}'
  )
);

test(
  'sort mixed properties in combination with short- and longhand properties',
  processCSS(
    'a{z-index:0;animation-name:a;flex-wrap:0;animation:b;flex-flow:1}',
    'a{animation-name:a;animation:b;flex-wrap:0;flex-flow:1;z-index:0}'
  )
);

test(
  'works with postcss-merge-longhand, margin',
  processCSS('a{z-index:1;margin-top:0;margin:0}', 'a{margin:0;z-index:1}')
);

test(
  'works with postcss-merge-longhand, padding',
  processCSS('a{z-index:1;padding-top:0;padding:0}', 'a{padding:0;z-index:1}')
);

test(
  'works with postcss-merge-longhand, border',
  processCSS('a{z-index:1;border-top:0;border:0}', 'a{border:0;z-index:1}')
);
