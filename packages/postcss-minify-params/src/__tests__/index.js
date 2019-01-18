import test from 'ava';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

test(
    'should normalise @media queries',
    processCSS,
    '@media SCREEN ,\tprint {h1{color:red}}@media print,screen{h2{color:blue}}',
    '@media print,SCREEN {h1{color:red}}@media print,screen{h2{color:blue}}'
);

test(
    'should normalise @media queries (uppercase)',
    processCSS,
    '@MEDIA SCREEN ,\tPRINT {h1{color:red}}@MEDIA PRINT,SCREEN{h2{color:blue}}',
    '@MEDIA PRINT,SCREEN {h1{color:red}}@MEDIA PRINT,SCREEN{h2{color:blue}}'
);

test(
    'should normalise @media queries (2)',
    processCSS,
    '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:blue}}',
    '@media only screen and (min-width:400px,min-height:500px){h1{color:blue}}'
);

test(
    'should normalise @media queries (3)',
    processCSS,
    '@media (min-height: 680px),(min-height: 680px){h1{color:red}}',
    '@media (min-height:680px){h1{color:red}}'
);

test.skip(
    'should normalise @media queries (3) (lowercase and uppercase)',
    processCSS,
    '@media (min-height: 680px),(MIN-HEIGHT: 680PX){h1{color:red}}',
    '@media (min-height:680px){h1{color:red}}'
);

test(
    'should normalise "all" in @media queries',
    processCSS,
    '@media all{h1{color:blue}}',
    '@media{h1{color:blue}}',
    {env: 'chrome58'}
);

test(
    'should normalise "all" in @media queries (uppercase)',
    processCSS,
    '@MEDIA ALL{h1{color:blue}}',
    '@MEDIA{h1{color:blue}}',
    {env: 'chrome58'}
);

test(
    'should not normalise "all" in @media queries',
    processCSS,
    '@media all{h1{color:blue}}',
    '@media all{h1{color:blue}}',
    {env: 'ie11'}
);

test(
    'should normalise "all and" in @media queries',
    processCSS,
    '@media all and (min-width:500px){h1{color:blue}}',
    '@media (min-width:500px){h1{color:blue}}'
);

test(
    'should normalise "all and" in @media queries (uppercase)',
    processCSS,
    '@media ALL AND (min-width:500px){h1{color:blue}}',
    '@media (min-width:500px){h1{color:blue}}'
);

test(
    'should not normalise "not all and" in @media queries',
    processCSS,
    '@media not all and (min-width: 768px){h1{color:blue}}',
    '@media not all and (min-width:768px){h1{color:blue}}'
);

test(
    'should not remove "all" from other at-rules',
    passthroughCSS,
    '@foo all;'
);

test(
    'should not mangle @keyframe from & 100% in other values',
    passthroughCSS,
    '@keyframes test{x-from-tag{color:red}5100%{color:blue}}'
);

test(
    'should not parse at rules without params',
    passthroughCSS,
    '@font-face{font-family:test;src:local(test)}'
);

test(
    'should reduce min-aspect-ratio',
    processCSS,
    '@media (min-aspect-ratio: 32/18){h1{color:blue}}',
    '@media (min-aspect-ratio:16/9){h1{color:blue}}'
);

test(
    'should reduce min-aspect-ratio (uppercase)',
    processCSS,
    '@media (MIN-ASPECT-RATIO: 32/18){h1{color:blue}}',
    '@media (MIN-ASPECT-RATIO:16/9){h1{color:blue}}'
);

test(
    'should reduce max-aspect-ratio',
    processCSS,
    '@media (max-aspect-ratio: 48000000/32000000){h1{color:blue}}',
    '@media (max-aspect-ratio:3/2){h1{color:blue}}'
);

test(
    'should multiply aspect ratio',
    processCSS,
    '@media (max-aspect-ratio: 1.5/1){h1{color:blue}}',
    '@media (max-aspect-ratio:3/2){h1{color:blue}}'
);

test(
    'should multiply aspect ratio (2)',
    processCSS,
    '@media (max-aspect-ratio: .5 / 1){h1{color:blue}}',
    '@media (max-aspect-ratio:1/2){h1{color:blue}}'
);

test(
    'should not throw on empty parentheses',
    passthroughCSS,
    '@media (){h1{color:blue}}'
);

test(
    'should not mangle @value',
    passthroughCSS,
    `@value vertical, center from './Flex.mod.css';`
);

test(
    'should not mangle @value (uppercase)',
    passthroughCSS,
    `@VALUE vertical, center from './Flex.mod.css';`
);

test(
    'should not mangle @page',
    passthroughCSS,
    '@page :first { margin: 0; }'
);

test(
    'should not mangle @page (uppercase)',
    passthroughCSS,
    '@PAGE :first { margin: 0; }'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
