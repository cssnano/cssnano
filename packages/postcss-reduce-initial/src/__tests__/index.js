import test from 'ava';
import fromInitial from '../../data/fromInitial.json';
import toInitial from '../../data/toInitial.json';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

function convertInitial (t, property, value) {
    return processCSS(t, `${property}:initial`, `${property}:${value}`);
}

function convertToInitial (t, property, value) {
    return Promise.all([
        processCSS(t, `${property}:${value}`, `${property}:initial`, {env: 'chrome58'}),
        passthroughCSS(t, `${property}:${value}`, {env: 'ie6'}),
    ]);
}

Object.keys(fromInitial).forEach(property => {
    test(
        `${property}: initial => ${property}: ${fromInitial[property]}`,
        convertInitial,
        property,
        fromInitial[property]
    );
});

Object.keys(toInitial).forEach(property => {
    test(
        `${property}: ${toInitial[property]} => ${property}: initial`,
        convertToInitial,
        property,
        toInitial[property]
    );
});

test(
    'cursor: initial => cursor: auto (uppercase property and value)',
    processCSS,
    'CURSOR: INITIAL',
    'CURSOR: auto'
);

test(
    'z-index: initial => z-index: auto (uppercase property and value)',
    processCSS,
    'Z-INDEX: INITIAL',
    'Z-INDEX: auto'
);

test(
    'cursor: initial => cursor: auto (uppercase property and value)',
    processCSS,
    'CURSOR: INITIAL',
    'CURSOR: auto'
);

test(
    'border-block-color: currentColor => border-block-color: initial',
    processCSS,
    'border-block-color: currentColor',
    'border-block-color: initial',
    {env: 'chrome58'}
);

test(
    'BORDER-BLOCK-COLOR: CURRENTCOLOR => border-block-color: initial (uppercase property and value)',
    processCSS,
    'BORDER-BLOCK-COLOR: CURRENTCOLOR',
    'BORDER-BLOCK-COLOR: initial',
    {env: 'chrome58'}
);

test(
    'should pass through when an initial value is longer',
    passthroughCSS,
    'writing-mode:initial' // initial value is horizontal-tb
);

test(
    'should pass through when an initial value is longer (uppercase property and value)',
    passthroughCSS,
    'WRITING-MODE:INITIAL' // initial value is horizontal-tb
);

test(
    'should pass through non-initial values',
    passthroughCSS,
    'all:inherit'
);

test(
    'should pass through non-initial values (uppercase property and value)',
    passthroughCSS,
    'ALL:INHERIT'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
