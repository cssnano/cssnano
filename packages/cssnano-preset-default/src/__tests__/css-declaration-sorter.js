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
);
