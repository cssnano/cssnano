import ava from 'ava';
import postcss from 'postcss';
import plugin from '../';
import pkg from '../../package.json';
import encode from './../lib/encode';

const name = pkg.name;

const tests = [{
    message: 'should rename keyframes',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
}, {
    message: 'should rename multiple keyframes',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}'
}, {
    message: 'should reuse the same animation name for vendor prefixed keyframes',
    fixture: '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    expected: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
}, {
    message: 'should support multiple animations',
    fixture: '@keyframes one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
    expected: '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes b{0%{border-width:0;opacity:0}}.loader{animation:a 1250ms infinite linear,b .3s ease-out both}'
}, {
    message: 'should not touch animation names that are not defined in the file',
    fixture: '.one{animation-name:fadeInUp}',
    expected: '.one{animation-name:fadeInUp}'
}, {
    message: 'should not touch keyframes that are not referenced in the file',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}',
    expected: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}'
}, {
    message: 'should not touch keyframes & animation names, combined',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}',
    expected: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}'
}, {
    message: 'should rename counter styles',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
}, {
    message: 'should rename multiple counter styles & be aware of extensions',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends  custom;prefix:"-"}ol{list-style:custom2}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;prefix:"-"}ol{list-style:b}'
}, {
    message: 'should not touch counter styles that are not referenced in the file',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}',
    expected: '@counter-style custom{system:extends decimal;suffix:"> "}'
}, {
    message: 'should not touch list-styles that are not defined in the file',
    fixture: 'ol{list-style:custom2}',
    expected: 'ol{list-style:custom2}'
}, {
    message: 'should rename counters',
    fixture: 'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    expected: 'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
}, {
    message: 'should rename counters (2)',
    fixture: 'h3:before{content:counter(section, section2);counter-increment:section}',
    expected: 'h3:before{content:counter(a,section2);counter-increment:a}'
}, {
    message: 'should rename multiple counters',
    fixture: 'h1:before{counter-reset:chapter 1 section page 1;content: counter(chapter) \t "."  counter(section) " (pg." counter(page) ") "}',
    expected: 'h1:before{counter-reset:a 1 b c 1;content: counter(a) "." counter(b) " (pg." counter(c) ") "}'
}, {
    message: 'should rename multiple counters with random order',
    fixture: 'h1:before{content: counter(chapter) "." counter(section) " (pg." counter(page) ") ";counter-reset:chapter 1 section  page 1}',
    expected: 'h1:before{content: counter(a) "." counter(b) " (pg." counter(c) ") ";counter-reset:a 1 b c 1}'
}, {
    message: 'should not touch counters that are not outputted',
    fixture: 'h1{counter-reset:chapter  1 section page 1}',
    expected: 'h1{counter-reset:chapter 1 section page 1}'
}, {
    message: 'should not touch counter functions which are not defined',
    fixture: 'h1:before{content:counter(chapter) ". "}',
    expected: 'h1:before{content:counter(chapter) ". "}'
}, {
    message: 'should not touch keyframes names',
    fixture: [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}'
    ].join(''),
    expected: [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
        'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
    ].join(''),
    options: {keyframes: false}
}, {
    message: 'should not touch counter styles',
    fixture: [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}'
    ].join(''),
    expected: [
        '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
    ].join(''),
    options: {counterStyle: false}
}, {
    message: 'should not touch counter functions',
    fixture: [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}'
    ].join(''),
    expected: [
        '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
        '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}'
    ].join(''),
    options: {counter: false}
}, {
    message: '',
    fixture: [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}'
    ].join(''),
    expected: [
        '@keyframes PREFIXwhiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms PREFIXwhiteToBlack}',
        '@counter-style PREFIXcustom{system:extends decimal;suffix:"> "}ol{list-style:PREFIXcustom}',
        'body{counter-reset:PREFIXsection}h3:before{counter-increment:PREFIXsection;content:"Section" counter(PREFIXsection) ": "}'
    ].join(''),
    options: {encoder: val => `PREFIX${val}`}
}];

tests.forEach(test => {
    ava(test.message, t => {
        let options = test.options || {};
        return postcss([ plugin(options) ]).process(test.fixture).then(result => {
            t.same(result.css, test.expected);
        });
    });
});

ava('encoder', t => {
    let iterations = new Array(1984);
    let arr = Array.apply([], iterations).map((a, b) => b);
    let cache = [];

    arr.map(num => {
        let encoded = encode(null, num);
        cache.push(encoded);
        let indexes = cache.filter(c => c === encoded);
        t.same(indexes.length, 1, encoded + ' should be returned only once');
    });
});

ava('should use the postcss plugin api', t => {
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.same(plugin().postcssPlugin, name, 'should be able to access name');
});
