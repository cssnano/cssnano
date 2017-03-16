import test from 'ava';
import {integrationTests, loadPreset} from '../../../../util/testHelpers.js';
import preset from '..';

test(
    'should correctly handle the framework tests',
    integrationTests,
    preset,
    `${__dirname}/integrations`
);

function excludeProcessor (t, options) {
    const input = `h1{z-index:10}`;
    return loadPreset(preset(options)).process(input).then(({css}) => {
        t.is(css, input);
    });
}

test(
    excludeProcessor,
    {zindex: false}
);

test(
    excludeProcessor,
    {zindex: {exclude: true}}
);
