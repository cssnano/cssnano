import test from 'ava';
import preset from '..';
import {processCSSWithPresetFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSWithPresetFactory(preset);

test(
    'keep order of short- and longhand properties',
    passthroughCSS,
    'h1{animation-name:a;animation:b}'
);

test(
    'keep order of short- and longhand properties and sort remaining',
    processCSS,
    'h1{animation-name:a;z-index:0;animation:b;color:0;}',
    'h1{animation-name:a;animation:b;color:0;z-index:0}'
);

test(
    'keep order of prefixed short- and longhand properties',
    passthroughCSS,
    'background:red;-webkit-background-clip:text;',
);
