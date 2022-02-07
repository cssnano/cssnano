'use strict';
const { test } = require('uvu');
const {
  processCSSWithPresetFactory,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

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
  'keep order of short- and longhand properties, in at-rule',
  passthroughCSS('@supports(display:grid){a{animation:a;animation-name:b}}')
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
  'keep order of border properties, short- and longhand, left to right',
  passthroughCSS('a{border-color:purple;border-top:1px solid}')
);

test(
  'keep all property at the top',
  processCSS(
    'a{all:unset;display:flex;align-items:center}',
    'a{all:unset;align-items:center;display:flex}'
  )
);

test(
  'move all property to the top',
  processCSS(
    'a{display:flex;all:unset;align-items:center}',
    'a{all:unset;align-items:center;display:flex}'
  )
);

test(
  'keep order of CSS variables',
  processCSS(
    `:root{--a-var:'value';--c-var:calc(10px + 20px);--b-var: 12px;}`,
    ':root{--a-var:"value";--c-var:30px;--b-var:12px}'
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
  'sort properties inside at-rules, @media',
  processCSS(
    '@media(min-width:0){flex:1;animation:a}',
    '@media(min-width:0){animation:a;flex:1}'
  )
);

test(
  'sort properties inside at-rules, @supports',
  processCSS(
    '@supports(display:grid){flex:1;animation:a}',
    '@supports(display:grid){animation:a;flex:1}'
  )
);

test(
  'sort properties inside at-rules, @font-face',
  processCSS(
    '@font-face{font-family:a;src:url()}',
    '@font-face{font-family:a;src:url()}'
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

test(
  'works with postcss-merge-longhand, border keep short- and longhand order',
  processCSS(
    'a{border-color:purple;border-top-width:2px;border-top-style:solid}',
    'a{border-top:2px solid;border-color:purple}'
  )
);

test(
  'works with postcss-merge-longhand, border keep mixed short- and longhand order',
  processCSS(
    'a{border-color:purple;border:0;border-top:3px solid}',
    'a{border:0;border-top:3px solid}'
  )
);
test.run();
