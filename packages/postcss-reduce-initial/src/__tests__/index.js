import test from 'ava';
import values from '../../data/values.json';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

function convertInitial (t, property, value) {
    return processCSS(t, `${property}:initial`, `${property}:${value}`);
}

Object.keys(values).forEach(property => {
    test(
        `${property}: initial => ${property}: ${values[property]}`,
        convertInitial,
        property,
        values[property]
    );
});

test(
    'should pass through when an initial value is longer',
    passthroughCSS,
    'writing-mode:initial' // initial value is horizontal-tb
);

test(
    'should pass through non-initial values',
    passthroughCSS,
    'all:inherit'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
