import test from 'ava';
import mappings from '../lib/map';
import plugin from '..';
import getData from '../../../../util/getData';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);
const data = getData(mappings);

test(
    'should pass through "block ruby"',
    passthroughCSS,
    'display:block ruby;'
);

test(
    'should pass through single values',
    passthroughCSS,
    'display:block;'
);

Object.keys(data).forEach(key => {
    const fixture = data[key];
    test(
        `display: ${fixture} => display: ${key}`,
        processCSS,
        `display:${fixture}`,
        `display:${key}`
    );
});

test(
    `display: block flow => display: block (uppercase property and values)`,
    processCSS,
    `DISPLAY:BLOCK FLOW`,
    `DISPLAY:block`
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
