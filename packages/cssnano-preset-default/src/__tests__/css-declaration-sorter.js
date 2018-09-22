import test from 'ava';
import preset from '..';
import {processCSSWithPresetFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSWithPresetFactory(preset);

test(
    'keep order of short- and longhand properties, left to right',
    passthroughCSS,
    'a{animation-name:a;animation:b}'
);

test(
    'keep order of short- and longhand properties, right to left',
    passthroughCSS,
    'a{animation:b;animation-name:a}'
);

test(
    'keep order of short- and longhand properties and sort remaining',
    processCSS,
    'a{animation-name:a;z-index:0;animation:b;color:0;}',
    'a{animation-name:a;animation:b;color:0;z-index:0}'
);

test(
    'keep order of prefixed short- and longhand properties',
    passthroughCSS,
    'a{background:red;-webkit-background-clip:text}',
);

test(
    'keep properties that are not in `safe-order.json` in the same relative order',
    processCSS,
    'a{line-height:1.5;z-index:0;font-size:100%}',
    'a{line-height:1.5;font-size:100%;z-index:0}',
);

test(
    'move properties that are not in `safe-order.json` to the start and sort remaining',
    processCSS,
    'a{z-index:0;font:a;color:a}',
    'a{font:a;color:a;z-index:0}',
);

test(
    'works with postcss-merge-longhand, margin',
    processCSS,
    'a{z-index:1;margin-top:0;margin:0}',
    'a{margin:0;z-index:1}',
);

test(
    'works with postcss-merge-longhand, padding',
    processCSS,
    'a{z-index:1;padding-top:0;padding:0}',
    'a{padding:0;z-index:1}',
);

test(
    'works with postcss-merge-longhand, border',
    processCSS,
    'a{z-index:1;border-top:0;border:0}',
    'a{border:0;z-index:1}',
);

test.failing(
    'do not move border properties until postcss-merge-longhand merges radius properties',
    processCSS,
    'a{border-radius:10px;border-bottom-left-radius:0}',
    'a{border-radius:10px;border-bottom-left-radius:0}',
)
