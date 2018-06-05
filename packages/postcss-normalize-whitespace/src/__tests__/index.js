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
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - (100px / var(--test)))}'
);

test(
    'should trim whitespace from nested functions (uppercase "calc")',
    processCSS,
    'h1{width:CALC(10px - ( 100px / var(--test) ))}',
    'h1{width:CALC(10px - (100px / var(--test)))}'
);

test(
    'should trim whitespace from nested functions (preset)',
    withDefaultPreset,
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - 100px / var(--test))}',
);
