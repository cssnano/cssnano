import test from 'ava';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS} = processCSSFactory(plugin);

test(
    'should normalize uppercased declaration',
    processCSS,
    'a {COLOR: #DDD;}',
    'a {color: #ddd;}'
);

test(
    'should normalize background declaration',
    processCSS,
    'a {background: url("https://example.com/SOMETHING") REPEAT-y #fc0;}',
    'a {background: url("https://example.com/SOMETHING") repeat-y #fc0;}'
);

test(
    'should normalize background-image declaration',
    processCSS,
    'a {BACKGROUND-IMAGE: url("https://example.com/SOMETHING");}',
    'a {background-image: url("https://example.com/SOMETHING");}'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
