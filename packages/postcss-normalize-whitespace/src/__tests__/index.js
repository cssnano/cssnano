import test from 'ava';
import plugin from '..';
import {
    processCSSFactory,
    processCSSWithPresetFactory,
} from '../../../../util/testHelpers';

const {processCSS} = processCSSFactory(plugin);
const {processCSS: withDefaultPreset} = processCSSWithPresetFactory('default');

test(
    'should trim whitespace from nested functions',
    processCSS,
    'h1{width:calc(10px - ( 100px / 2em ))}',
    'h1{width:calc(10px - (100px / 2em))}',
);

test(
    'should trim whitespace from nested functions (preset)',
    withDefaultPreset,
    'h1{width:calc(10px - ( 100px / 2em ))}',
    'h1{width:calc(10px - (100px / 2em))}',
);
