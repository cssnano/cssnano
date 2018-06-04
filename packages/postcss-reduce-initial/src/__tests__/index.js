import test from 'ava';
import fromInitial from '../../data/fromInitial.json';
import toInitial from '../../data/toInitial.json';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

function convertInitial (t, property, value) {
    return processCSS(t, `${property}:initial`, `${property}:${value}`);
}

function convertInitialUpperCase (t, property, value) {
    return processCSS(t, `${property.toUpperCase()}:INITIAL`, `${property}:${value}`);
}

function convertToInitial (t, property, value) {
    return Promise.all([
        processCSS(t, `${property}:${value}`, `${property}:initial`, {env: 'chrome58'}),
        passthroughCSS(t, `${property}:${value}`, {env: 'ie6'}),
    ]);
}

function convertToInitialUpperCase (t, property, value) {
    return Promise.all([
        processCSS(t, `${property.toUpperCase()}:${value.toUpperCase()}`, `${property}:initial`, {env: 'chrome58'}),
        passthroughCSS(t, `${property.toUpperCase()}:${value.toUpperCase()}`, {env: 'ie6'}),
    ]);
}

Object.keys(fromInitial).forEach(property => {
    test(
        `${property}: initial => ${property}: ${fromInitial[property]}`,
        convertInitial,
        property,
        fromInitial[property]
    );
    test(
        `${property.toUpperCase()}: INITIAL => ${property}: ${fromInitial[property]}`,
        convertInitialUpperCase,
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
    test(
        `${property.toUpperCase()}: ${toInitial[property].toUpperCase()} => ${property}: initial`,
        convertToInitialUpperCase,
        property,
        toInitial[property]
    );
});

test(
    'should pass through when an initial value is longer',
    passthroughCSS,
    'writing-mode:initial' // initial value is horizontal-tb
);

test(
    'should pass through when an initial value is longer (2)',
    passthroughCSS,
    'WRITING-MODE:INITIAL' // initial value is horizontal-tb
);

test(
    'should pass through non-initial values',
    passthroughCSS,
    'all:inherit'
);

test(
    'should pass through non-initial values (2)',
    passthroughCSS,
    'ALL:INHERIT'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
