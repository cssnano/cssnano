import test from 'ava';
import preset from '..';
import {processCSSWithPresetFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSWithPresetFactory(preset);

test(
    'keep order of short- and longhand properties',
    passthroughCSS,
    'a{animation-name:a;animation:b}'
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
