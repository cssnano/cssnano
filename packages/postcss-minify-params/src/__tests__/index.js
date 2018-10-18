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
    '@media(min-height:680px){h1{color:red}}'
);

test.skip(
    'should normalise @media queries (3) (lowercase and uppercase)',
    processCSS,
    '@media (min-height: 680px),(MIN-HEIGHT: 680PX){h1{color:red}}',
    '@media(min-height:680px){h1{color:red}}'
);

test(
    'should normalise @media queries (4)',
    processCSS,
    '@media (min-width:1px){:root{background:lime}}',
    '@media(min-width:1px){:root{background:lime}}'
);

test(
    'should normalise @media queries (5)',
    processCSS,
    '@media ( color ){}',
    '@media(color){}'
);

test(
    'should normalise @media queries (6)',
    processCSS,
    '@media (min-width: 30em) and (orientation: landscape){}',
    '@media(min-width:30em) and (orientation:landscape){}'
);

test(
    'should normalise @media queries (7)',
    processCSS,
    '@media (min-height: 680px), screen and (orientation: portrait){}',
    '@media(min-height:680px),screen and (orientation:portrait){}'
);

test(
    'should normalise @media queries (8)',
    processCSS,
    '@media ( not( hover ) ){}',
    '@media(not(hover)){}'
);

test(
    'should normalise @supports',
    processCSS,
    '@supports (display: grid){div{display:block}}',
    '@supports(display:grid){div{display:block}}'
);

test(
    'should normalise @supports (2)',
    processCSS,
    '@SUPPORTS (display: grid){div{display:block}}',
    '@SUPPORTS(display:grid){div{display:block}}'
);

test(
    'should normalise nested at rules',
    processCSS,
    '@media (min-width: 900px){@media (min-width: 900px){div{display:block}}}',
    '@media(min-width:900px){@media(min-width:900px){div{display:block}}}'
);

test(
    'should normalise nested at rules (1)',
    processCSS,
    '@supports (display: flex){@media (min-width: 900px){div{display:block}}}',
    '@supports(display:flex){@media(min-width:900px){div{display:block}}}'
);

test(
    'should normalise spaces after comma',
    processCSS,
    '@media print, screen{}',
    '@media print,screen{}'
);

test(
    'should sort params',
    processCSS,
    '@media screen, print{}',
    '@media print,screen{}'
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
    '@media(min-width:500px){h1{color:blue}}'
);

test(
    'should normalise "all and" in @media queries (uppercase)',
    processCSS,
    '@media ALL AND (min-width:500px){h1{color:blue}}',
    '@media(min-width:500px){h1{color:blue}}'
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
    'should not change charset params',
    passthroughCSS,
    '@charset "utf-8";'
);

test(
    'should not change import params',
    passthroughCSS,
    '@import url("fineprint.css") print;'
);

test(
    'should not change namespace params',
    passthroughCSS,
    '@namespace url(http://www.w3.org/1999/xhtml);'
);

test(
    'should not change document params',
    passthroughCSS,
    '@document url("https://www.example.com/");'
);

test(
    'should not change keyframes params',
    passthroughCSS,
    '@keyframes sLiDeIn{}'
);

test(
    'should not change counter-style params',
    passthroughCSS,
    '@counter-style tHuMbS'
);

test(
    'should not change unknown params',
    passthroughCSS,
    '@unknown iDeNt keyword (foo:bar) {}'
);

test(
    'should not change unknown params (1)',
    passthroughCSS,
    '@unknown iDeNt keyword (foo:bar);'
);

test(
    'should reduce min-aspect-ratio',
    processCSS,
    '@media (min-aspect-ratio: 32/18){h1{color:blue}}',
    '@media(min-aspect-ratio:16/9){h1{color:blue}}'
);

test(
    'should reduce min-aspect-ratio (uppercase)',
    processCSS,
    '@media (MIN-ASPECT-RATIO: 32/18){h1{color:blue}}',
    '@media(MIN-ASPECT-RATIO:16/9){h1{color:blue}}'
);

test(
    'should reduce max-aspect-ratio',
    processCSS,
    '@media (max-aspect-ratio: 48000000/32000000){h1{color:blue}}',
    '@media(max-aspect-ratio:3/2){h1{color:blue}}'
);

test(
    'should multiply aspect ratio',
    processCSS,
    '@media (max-aspect-ratio: 1.5/1){h1{color:blue}}',
    '@media(max-aspect-ratio:3/2){h1{color:blue}}'
);

test(
    'should multiply aspect ratio (2)',
    processCSS,
    '@media (max-aspect-ratio: .5 / 1){h1{color:blue}}',
    '@media(max-aspect-ratio:1/2){h1{color:blue}}'
);

test(
    'should not throw on empty parentheses',
    passthroughCSS,
    '@media(){h1{color:blue}}'
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
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
