import test from 'ava';
import plugin from '..';
import {processCSSFactory} from '../../../../util/testHelpers';

const {passthroughCSS, processCSS} = processCSSFactory(plugin);

test(
    'should remove unused prefixed namespace',
    processCSS,
    '@namespace svg url(http://www.w3.org/2000/svg);a{color:blue}',
    'a{color:blue}'
);

test(
    'should remove invalid namespace',
    processCSS,
    '@namespace',
    ''
);

test(
    'shouldn\'t remove default namespace',
    passthroughCSS,
    '@namespace url(http://www.w3.org/2000/svg)'
);

test(
    'shouldn\'t remove used prefixed namespace',
    passthroughCSS,
    '@namespace svg url(http://www.w3.org/2000/svg);svg|a{color:blue}'
);

test(
    'shouldn\'t remove prefixed namespace in case of universal selector',
    passthroughCSS,
    '@namespace svg url(http://www.w3.org/2000/svg);*|a{color:blue}'
);

test(
    'shouldn\'t remove unused prefixed namespace',
    passthroughCSS,
    '@namespace svg url(http://www.w3.org/2000/svg)',
    {namespace: false}
);
