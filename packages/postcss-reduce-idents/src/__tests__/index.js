import test from 'ava';
import postcss from 'postcss';
import plugin from '..';
import encode from '../lib/encode';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

test(
    'should rename keyframes',
    processCSS,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
    '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
);

test(
    'should rename multiple keyframes',
    processCSS,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}',
);

test(
    'should reuse the same animation name for vendor prefixed keyframes',
    processCSS,
    '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
);

test(
    'should support multiple animations',
    processCSS,
    '@keyframes one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
    '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes b{0%{border-width:0;opacity:0}}.loader{animation:a 1250ms infinite linear,b .3s ease-out both}'
);

test(
    'should not touch animation names that are not defined in the file',
    passthroughCSS,
    '.one{animation-name:fadeInUp}'
);

test(
    'should not touch keyframes that are not referenced in the file',
    passthroughCSS,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}'
);

test(
    'should not touch keyframes & animation names, combined',
    passthroughCSS,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}'
);

test(
    'should rename counter styles',
    processCSS,
    '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
    '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
);

test(
    'should rename multiple counter styles & be aware of extensions',
    processCSS,
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends  custom;prefix:"-"}ol{list-style:custom2}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;prefix:"-"}ol{list-style:b}'
);

test(
    'should not touch counter styles that are not referenced in the file',
    passthroughCSS,
    '@counter-style custom{system:extends decimal;suffix:"> "}'
);

test(
    'should not touch list-styles that are not defined in the file',
    passthroughCSS,
    'ol{list-style:custom2}'
);

test(
    'should rename counters',
    processCSS,
    'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
);

test(
    'should rename counters (2)',
    processCSS,
    'h3:before{content:counter(section, section2);counter-increment:section}',
    'h3:before{content:counter(a,section2);counter-increment:a}'
);

test(
    'should rename counters (3)',
    processCSS,
    'li{counter-increment:list-item}li::marker{content:"(" counters(list-item,".") ")"}',
    'li{counter-increment:a}li::marker{content:"(" counters(a,".") ")"}'
);

test(
    'should rename multiple counters',
    processCSS,
    'h1:before{counter-reset:chapter 1 section page 1;content: counter(chapter) \t "."  counter(section) " (pg." counter(page) ") "}',
    'h1:before{counter-reset:a 1 b c 1;content: counter(a) "." counter(b) " (pg." counter(c) ") "}'
);

test(
    'should rename multiple counters with random order',
    processCSS,
    'h1:before{content: counter(chapter) "." counter(section) " (pg." counter(page) ") ";counter-reset:chapter 1 section  page 1}',
    'h1:before{content: counter(a) "." counter(b) " (pg." counter(c) ") ";counter-reset:a 1 b c 1}'
);

test(
    'should not touch counters that are not outputted',
    passthroughCSS,
    'h1{counter-reset:chapter 1 section page 1}'
);

test(
    'should not touch counter functions which are not defined',
    passthroughCSS,
    'h1:before{content:counter(chapter) ". "}',
);

test(
    'should not touch keyframes names',
    processCSS,
    [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
        'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
    ].join(''),
    {keyframes: false}
);

test(
    'should not touch counter styles',
    processCSS,
    [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
        '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
    ].join(''),
    {counterStyle: false}
);

test(
    'should not touch counter functions',
    processCSS,
    [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
        '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
        '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    {counter: false}
);

test(
    'should rename grid-template-areas and grid-area',
    processCSS,
    [
        'body{grid-template-areas:"head head" \n"nav  main"\n"nav  foot";}',
        'header { grid-area: head }',
        'nav{grid-area:nav}',
        'main{grid-area:main}',
        'footer{grid-area:foot}',
    ].join(''),
    [
        'body{grid-template-areas:"a a" "b c" "b d";}',
        'header { grid-area: a }',
        'nav{grid-area:b}',
        'main{grid-area:c}',
        'footer{grid-area:d}',
    ].join('')
);

test(
    'should rename grid-template short syntax',
    processCSS,
    [
        'body{grid-template: "head head" 50px "nav main" 1fr "...  foot" 30px / 150px 1fr;}',
        'header { grid-area: head }',
        'nav{grid-area:nav}',
        'main{grid-area:main}',
        'footer{grid-area:foot}',
    ].join(''),
    [
        'body{grid-template: "a a" 50px "b c" 1fr ". d" 30px / 150px 1fr;}',
        'header { grid-area: a }',
        'nav{grid-area:b}',
        'main{grid-area:c}',
        'footer{grid-area:d}',
    ].join('')
);

test(
    'should not touch grid templates',
    passthroughCSS,
    [
        'body{grid-template-areas:"head head" \n"nav  main"\n"nav  foot";}',
        'header { grid-area: head }',
        'nav{grid-area:nav}',
        'main{grid-area:main}',
        'footer{grid-area:foot}',
    ].join(''),
    {gridTemplate: false}
);

test(
    'should not rename reserved keywords in grid areas',
    passthroughCSS,
    [
        'body{grid-template: repeat(4, 1fr) / auto 100px;}',
        'main{grid-area: 2 / 2 / auto / span 3;}',
    ].join(''),
    {gridTemplate: true}
);

test(
    'should allow a custom prefix',
    processCSS,
    [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
        '@keyframes PREFIXwhiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms PREFIXwhiteToBlack}',
        '@counter-style PREFIXcustom{system:extends decimal;suffix:"> "}ol{list-style:PREFIXcustom}',
        'body{counter-reset:PREFIXsection}h3:before{counter-increment:PREFIXsection;content:"Section" counter(PREFIXsection) ": "}',
    ].join(''),
    {encoder: val => `PREFIX${val}`}
);

test('should not generate same ident when plugin instance is reused', t => {
    const instance = postcss(plugin);
    return Promise.all([
        instance.process('@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}'),
        instance.process('@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.two{animation-name:fadeOut}'),
    ]).then(([result1, result2]) => {
        t.is(result1.css, '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}');
        t.is(result2.css, '@keyframes b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}');
    });
});

test('encoder', t => {
    let iterations = new Array(1984);
    let arr = Array.apply([], iterations).map((a, b) => b);
    let cache = [];

    arr.map(num => {
        let encoded = encode(null, num);
        cache.push(encoded);
        let indexes = cache.filter(c => c === encoded);
        t.deepEqual(indexes.length, 1, encoded + ' should be returned only once');
    });
});

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
