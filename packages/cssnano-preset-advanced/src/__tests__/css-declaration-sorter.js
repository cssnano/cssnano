import test from 'ava';
import preset from '..';
import {processCSSWithPresetFactory} from '../../../../util/testHelpers';

const {processCSS} = processCSSWithPresetFactory(preset);

test(
    'sorts both short- and longhand properties',
    processCSS,
    'h1{animation-name:a;animation:b}',
    'h1{animation:b;animation-name:a}',
);
